# routes/supplier.py
from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from flask_mail import Message
from database import db
from models import (
    User,
    WasteListing,
    WasteRequest,
    TransportJob,
    Notification,
    Collection,
    AdminSetting,
)
from utils.decorators import role_required
import logging
import threading

logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

supplier_bp = Blueprint("supplier", __name__)


# ─────────────────────────────────────────────────────────────
# HELPERS
# ─────────────────────────────────────────────────────────────
def current_user_id():
    return int(get_jwt_identity())


def _safe_float(value, default=0.0):
    try:
        return float(value) if value is not None else default
    except (ValueError, TypeError):
        return default


def get_setting(key, default=10.0):
    setting = AdminSetting.query.filter_by(key=key).first()
    if setting and setting.value is not None:
        try:
            return float(setting.value)
        except (ValueError, TypeError):
            return default
    return default


def calculate_amounts():
    """Snapshot of the admin-configured fixed pricing."""
    waste_value   = get_setting('waste_price', 10.00)
    platform_fee  = get_setting('platform_fee', 10.00)
    transport_fee = get_setting('transport_fee', 10.00)
    return {
        "waste_value":             waste_value,
        "transport_fee":           transport_fee,
        "platform_fee":            platform_fee,
        "total_amount":            waste_value + transport_fee + platform_fee,
        "price_per_unit":          0.0,
        "transport_rate_per_unit": 0.0,
    }


def _apply_pricing(listing, amounts):
    """
    Write admin-configured pricing onto a WasteListing.
    Uses ONLY columns that exist on the model (we verified via shell):
        price_per_unit, transport_rate_per_unit, waste_value,
        collection_fee, platform_fee, total_amount
    """
    if hasattr(listing, "price_per_unit"):
        listing.price_per_unit = amounts["price_per_unit"]
    if hasattr(listing, "transport_rate_per_unit"):
        listing.transport_rate_per_unit = amounts["transport_rate_per_unit"]
    if hasattr(listing, "waste_value"):
        listing.waste_value = amounts["waste_value"]
    if hasattr(listing, "platform_fee"):
        listing.platform_fee = amounts["platform_fee"]
    if hasattr(listing, "total_amount"):
        listing.total_amount = amounts["total_amount"]

    # transport fee is stored under collection_fee on this model
    if hasattr(listing, "collection_fee"):
        listing.collection_fee = amounts["transport_fee"]
    elif hasattr(listing, "transport_fee"):
        listing.transport_fee = amounts["transport_fee"]


def listing_to_dict(item):
    """Serialise a WasteListing safely. Exposes API name 'transport_fee'
    even though the DB column is 'collection_fee'."""
    if item is None:
        return None

    created = getattr(item, "created_at", None)

    # Read transport fee from whichever column exists
    transport_fee = 0.0
    if hasattr(item, "collection_fee"):
        transport_fee = _safe_float(item.collection_fee)
    elif hasattr(item, "transport_fee"):
        transport_fee = _safe_float(item.transport_fee)

    return {
        "id":             item.id,
        "waste_type":     item.waste_type,
        "category":       item.category,
        "quantity":       _safe_float(item.quantity),
        "unit":           item.unit,
        "location":       item.location,
        "pickup_address": item.pickup_address,
        "description":    item.description,
        "image_url":      item.image_url,
        "status":         item.status,
        "created_at":     created.isoformat() if created else None,
        # ── pricing ──
        "price_per_unit": _safe_float(getattr(item, "price_per_unit", 0)),
        "transport_rate_per_unit": _safe_float(
            getattr(item, "transport_rate_per_unit", 0)
        ),
        "waste_value":   _safe_float(getattr(item, "waste_value", 0)),
        "transport_fee": transport_fee,                       # API name
        "platform_fee":  _safe_float(getattr(item, "platform_fee", 0)),
        "total_amount":  _safe_float(getattr(item, "total_amount", 0)),
    }


# ─────────────────────────────────────────────────────────────
# DASHBOARD
# ─────────────────────────────────────────────────────────────
@supplier_bp.route("/supplier/dashboard", methods=["GET"])
@jwt_required()
@role_required("supplier")
def supplier_dashboard():
    try:
        user_id = current_user_id()
        current_app.logger.info(f"📊 Supplier dashboard requested for user_id: {user_id}")

        total_listings = WasteListing.query.filter_by(supplier_id=user_id).count()
        active_statuses = ["available", "requested", "assigned", "collected"]
        active_listings = WasteListing.query.filter(
            WasteListing.supplier_id == user_id,
            WasteListing.status.in_(active_statuses)
        ).count()
        completed_listings = WasteListing.query.filter(
            WasteListing.supplier_id == user_id,
            WasteListing.status == "completed"
        ).count()

        pending_requests = WasteRequest.query.join(WasteListing).filter(
            WasteListing.supplier_id == user_id,
            WasteRequest.status == "pending"
        ).count()
        approved_requests = WasteRequest.query.join(WasteListing).filter(
            WasteListing.supplier_id == user_id,
            WasteRequest.status == "approved"
        ).count()

        all_transport_jobs = TransportJob.query.filter_by(supplier_id=user_id).count()
        pending_collections = TransportJob.query.filter(
            TransportJob.supplier_id == user_id,
            TransportJob.status.in_(["open", "accepted"])
        ).count()
        in_progress_collections = TransportJob.query.filter(
            TransportJob.supplier_id == user_id,
            TransportJob.status.in_(["picked_up", "in_transit"])
        ).count()
        completed_collections = TransportJob.query.filter(
            TransportJob.supplier_id == user_id,
            TransportJob.status.in_(["delivered", "completed"])
        ).count()

        recent_listings = WasteListing.query.filter_by(
            supplier_id=user_id
        ).order_by(WasteListing.created_at.desc()).limit(5).all()

        upcoming_pickups = TransportJob.query.filter(
            TransportJob.supplier_id == user_id,
            TransportJob.status.in_(["open", "accepted", "picked_up", "in_transit"])
        ).order_by(TransportJob.created_at.asc()).limit(5).all()

        notifications = Notification.query.filter_by(
            user_id=user_id,
            is_read=False
        ).order_by(Notification.created_at.desc()).limit(5).all()

        return jsonify({
            "stats": {
                "myListings": active_listings,
                "totalListings": total_listings,
                "collectionRequests": all_transport_jobs,
                "pendingCollections": pending_collections,
                "completedCollections": completed_collections,
                "inProgressCollections": in_progress_collections,
                "pendingRequests": pending_requests,
                "approvedRequests": approved_requests,
            },
            "recentListings": [
                {
                    "id": item.id,
                    "waste_type": item.waste_type,
                    "quantity": item.quantity,
                    "unit": item.unit,
                    "location": item.location,
                    "status": item.status,
                    "total_amount": _safe_float(getattr(item, "total_amount", 0)),
                    "created_at": item.created_at.isoformat() if item.created_at else None,
                }
                for item in recent_listings
            ],
            "upcomingPickups": [
                {
                    "id": job.id,
                    "waste_type": job.waste_type,
                    "quantity": job.quantity,
                    "unit": getattr(job, "unit", "kg"),
                    "location": job.pickup_location,
                    "pickup_date": job.created_at.strftime("%Y-%m-%d") if job.created_at else None,
                    "pickup_time": job.created_at.strftime("%I:%M %p") if job.created_at else None,
                    "status": job.status,
                    "transporter": job.transporter.full_name if job.transporter else "Not assigned",
                }
                for job in upcoming_pickups
            ],
            "notifications": [
                {
                    "id": item.id,
                    "title": item.title,
                    "message": item.message,
                    "is_read": item.is_read,
                    "created_at": item.created_at.isoformat() if item.created_at else None,
                }
                for item in notifications
            ],
        }), 200

    except Exception as e:
        current_app.logger.error(f"❌ Supplier dashboard error: {e}", exc_info=True)
        return jsonify({"message": f"Internal server error: {str(e)}"}), 500


# ─────────────────────────────────────────────────────────────
# CREATE LISTING — with admin-set fixed pricing
# ─────────────────────────────────────────────────────────────
@supplier_bp.route("/supplier/listings", methods=["POST"])
@jwt_required()
@role_required("supplier")
def create_listing():
    try:
        user_id = current_user_id()
        data = request.get_json() or {}

        required_fields = ["waste_type", "quantity", "location"]
        for field in required_fields:
            if not data.get(field):
                return jsonify({"message": f"Missing required field: {field}"}), 400

        # ─── admin-set pricing snapshot ───
        amounts = calculate_amounts()
        current_app.logger.info(
            f"💰 Pricing snapshot → waste={amounts['waste_value']} "
            f"transport={amounts['transport_fee']} platform={amounts['platform_fee']} "
            f"total={amounts['total_amount']}"
        )

        listing = WasteListing(
            supplier_id=user_id,
            waste_type=data["waste_type"],
            category=data.get("category"),
            quantity=float(data["quantity"]),
            unit=data.get("unit", "kg"),
            location=data["location"],
            pickup_address=data.get("pickup_address"),
            description=data.get("description"),
            image_url=data.get("image_url"),
            status="available",
        )

        # Write pricing using only columns that exist
        _apply_pricing(listing, amounts)

        db.session.add(listing)
        db.session.commit()

        # ─── Email notification thread (unchanged logic) ───
        app = current_app._get_current_object()

        def send_emails():
            with app.app_context():
                try:
                    mail = app.extensions.get('mail')
                    if not mail:
                        app.logger.error("❌ Mail extension not found in app.extensions!")
                        return

                    producers = User.query.filter_by(
                        role='producer',
                        account_status='verified'
                    ).all()
                    app.logger.info(f"📧 Found {len(producers)} active producers.")

                    if not producers:
                        app.logger.info("No producers to notify.")
                        return

                    marketplace_url = "http://localhost:5173/dashboard/marketplace"
                    subject = f"New Waste Available: {listing.waste_type}"
                    total_display = f"KSh {_safe_float(getattr(listing, 'total_amount', 0)):,.2f}"

                    html_content = f"""
                    <!DOCTYPE html>
                    <html>
                    <head><meta charset="UTF-8"></head>
                    <body style="font-family: Arial, sans-serif; background: #f8fafc; padding: 20px;">
                        <table width="600" style="background: white; border-radius: 12px; margin: auto;">
                            <tr>
                                <td style="background: #11402D; padding: 30px; text-align: center; border-radius: 12px 12px 0 0;">
                                    <h1 style="color: white; margin: 0;">♻️ ReVive Energy</h1>
                                    <p style="color: #a7f3d0;">Waste‑to‑Energy Marketplace</p>
                                </td>
                            </tr>
                            <tr>
                                <td style="padding: 30px;">
                                    <h2 style="color: #11402D;">New Waste Listing Available</h2>
                                    <ul style="color: #4b5563; line-height: 1.8;">
                                        <li><strong>Type:</strong> {listing.waste_type}</li>
                                        <li><strong>Quantity:</strong> {listing.quantity} {listing.unit}</li>
                                        <li><strong>Location:</strong> {listing.location}</li>
                                        <li><strong>Pickup Address:</strong> {listing.pickup_address or "Not specified"}</li>
                                        <li><strong>Description:</strong> {listing.description or "No description provided"}</li>
                                        <li><strong>Total Amount:</strong> {total_display}</li>
                                    </ul>
                                    <div style="text-align: center; margin: 30px 0;">
                                        <a href="{marketplace_url}" style="background: #11402D; color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; font-weight: bold;">View in Marketplace</a>
                                    </div>
                                </td>
                            </tr>
                            <tr>
                                <td style="padding: 20px; text-align: center; color: #9ca3af; font-size: 12px;">
                                    <p>&copy; 2026 ReVive Energy. All rights reserved.</p>
                                </td>
                            </tr>
                        </table>
                    </body>
                    </html>
                    """

                    plain_text = f"""
ReVive Energy – New Waste Listing

Type: {listing.waste_type}
Quantity: {listing.quantity} {listing.unit}
Location: {listing.location}
Pickup Address: {listing.pickup_address or "Not specified"}
Description: {listing.description or "No description provided"}
Total Amount: {total_display}

View it here: {marketplace_url}
                    """

                    for producer in producers:
                        if not producer.email:
                            continue
                        msg = Message(
                            subject=subject,
                            recipients=[producer.email],
                            html=html_content,
                            body=plain_text,
                            sender=('ReVive Energy', app.config.get('MAIL_DEFAULT_SENDER')),
                        )
                        mail.send(msg)

                except Exception as e:
                    app.logger.error(f"❌ Email sending error: {e}", exc_info=True)

        threading.Thread(target=send_emails).start()

        return jsonify({
            "message": "Listing created successfully. Producers will be notified via email.",
            "id": listing.id,
            "listing": listing_to_dict(listing),
        }), 201

    except Exception as error:
        db.session.rollback()
        logger.error(f"Create listing error: {error}")
        return jsonify({"message": f"Server error: {str(error)}"}), 500


# ─────────────────────────────────────────────────────────────
# GET LISTINGS
# ─────────────────────────────────────────────────────────────
@supplier_bp.route("/supplier/listings", methods=["GET"])
@jwt_required()
@role_required("supplier")
def get_listings():
    try:
        user_id = current_user_id()
        listings = WasteListing.query.filter_by(
            supplier_id=user_id
        ).order_by(WasteListing.created_at.desc()).all()

        return jsonify([listing_to_dict(item) for item in listings]), 200

    except Exception as e:
        current_app.logger.error(
            f"❌ get_listings failed for user {current_user_id()}: {e}",
            exc_info=True,
        )
        return jsonify({"message": f"Failed to load listings: {e}"}), 500


# ─────────────────────────────────────────────────────────────
# UPDATE LISTING
# ─────────────────────────────────────────────────────────────
@supplier_bp.route("/supplier/listings/<int:listing_id>", methods=["PATCH"])
@jwt_required()
@role_required("supplier")
def update_listing(listing_id):
    user_id = current_user_id()
    listing = WasteListing.query.get_or_404(listing_id)

    if int(listing.supplier_id) != user_id:
        return jsonify({"message": "Unauthorized"}), 403

    data = request.get_json() or {}

    allowed_fields = [
        "waste_type",
        "quantity",
        "unit",
        "location",
        "pickup_address",
        "description",
        "image_url",
    ]

    for field in allowed_fields:
        if field in data:
            if field == "quantity":
                setattr(listing, field, float(data[field]))
            else:
                setattr(listing, field, data[field])

    # pricing fields are NOT editable by suppliers — set by admin only

    db.session.commit()

    return jsonify({
        "message": "Listing updated successfully",
        "listing": listing_to_dict(listing),
    }), 200


# ─────────────────────────────────────────────────────────────
# DELETE LISTING
# ─────────────────────────────────────────────────────────────
@supplier_bp.route("/supplier/listings/<int:listing_id>", methods=["DELETE"])
@jwt_required()
@role_required("supplier")
def delete_listing(listing_id):
    user_id = current_user_id()
    listing = WasteListing.query.get_or_404(listing_id)

    if int(listing.supplier_id) != user_id:
        return jsonify({"message": "Unauthorized"}), 403

    if listing.status not in ["available", "cancelled"]:
        return jsonify({"message": "Cannot delete listing in its current state"}), 400

    db.session.delete(listing)
    db.session.commit()

    return jsonify({"message": "Listing deleted successfully"}), 200


# ─────────────────────────────────────────────────────────────
# REQUESTS
# ─────────────────────────────────────────────────────────────
@supplier_bp.route("/supplier/requests", methods=["GET"])
@jwt_required()
@role_required("supplier")
def get_requests():
    user_id = current_user_id()
    requests = WasteRequest.query.join(WasteListing).filter(
        WasteListing.supplier_id == user_id
    ).order_by(WasteRequest.created_at.desc()).all()

    result = []
    for item in requests:
        listing = item.listing
        result.append({
            "id": item.id,
            "listing_id": item.listing_id,
            "waste_type": listing.waste_type if listing else None,
            "producer_name": item.producer.full_name if item.producer else "Unknown Producer",
            "producer_id": item.producer_id,
            "status": item.status,
            "message": item.message,
            "total_amount": _safe_float(getattr(listing, "total_amount", 0)) if listing else 0.0,
            "created_at": item.created_at.isoformat() if item.created_at else None,
        })
    return jsonify(result), 200


@supplier_bp.route("/supplier/requests/<int:request_id>/approve", methods=["PATCH"])
@jwt_required()
@role_required("supplier")
def approve_request(request_id):
    user_id = current_user_id()
    waste_request = WasteRequest.query.get_or_404(request_id)
    listing = WasteListing.query.get_or_404(waste_request.listing_id)

    if int(listing.supplier_id) != user_id:
        return jsonify({
            "message": "Unauthorized: this request does not belong to you",
            "listing_supplier_id": listing.supplier_id,
            "logged_in_user_id": user_id,
        }), 403

    if waste_request.status != "pending":
        return jsonify({"message": "Request already processed"}), 400

    waste_request.status = "approved"
    listing.status = "approved"

    notification = Notification(
        user_id=waste_request.producer_id,
        title="Waste Request Approved",
        message=f"Your request for {listing.waste_type} has been approved. Please proceed to payment.",
        type="request_approved",
    )

    db.session.add(notification)
    db.session.commit()

    return jsonify({
        "message": "Request approved successfully. Waiting for producer payment.",
        "request": {
            "id": waste_request.id,
            "status": waste_request.status,
            "listing_id": listing.id,
            "listing_status": listing.status,
            "total_amount": _safe_float(getattr(listing, "total_amount", 0)),
        },
    }), 200


@supplier_bp.route("/supplier/requests/<int:request_id>/reject", methods=["PATCH"])
@jwt_required()
@role_required("supplier")
def reject_request(request_id):
    user_id = current_user_id()
    waste_request = WasteRequest.query.get_or_404(request_id)
    listing = WasteListing.query.get_or_404(waste_request.listing_id)

    if int(listing.supplier_id) != user_id:
        return jsonify({
            "message": "Unauthorized: this request does not belong to you",
        }), 403

    if waste_request.status != "pending":
        return jsonify({"message": "Request already processed"}), 400

    waste_request.status = "rejected"

    notification = Notification(
        user_id=waste_request.producer_id,
        title="Waste Request Rejected",
        message=f"Your request for {listing.waste_type} was rejected.",
        type="request_rejected",
    )

    db.session.add(notification)
    db.session.commit()

    return jsonify({
        "message": "Request rejected successfully",
        "request": {"id": waste_request.id, "status": waste_request.status},
    }), 200


# ─────────────────────────────────────────────────────────────
# COLLECTIONS
# ─────────────────────────────────────────────────────────────
@supplier_bp.route("/supplier/collections", methods=["GET"])
@jwt_required()
@role_required("supplier")
def get_supplier_collections():
    user_id = current_user_id()
    jobs = TransportJob.query.filter_by(
        supplier_id=user_id
    ).order_by(TransportJob.created_at.desc()).all()

    result = []
    for job in jobs:
        transporter = job.transporter if job.transporter_id else None
        result.append({
            "id": job.id,
            "waste_type": job.waste_type,
            "quantity": job.quantity,
            "unit": getattr(job, "unit", "kg"),
            "pickup_location": job.pickup_location,
            "delivery_location": job.delivery_location,
            "status": job.status,
            "transporter_id": job.transporter_id,
            "transporter_name": transporter.full_name if transporter else None,
            "transporter_phone": transporter.phone if transporter else None,
            "vehicle_type": transporter.vehicle_types if transporter else None,
            "vehicle_number": transporter.license_number if transporter else None,
            "coverage_area": transporter.coverage_area if transporter else None,
            "created_at": job.created_at.isoformat() if job.created_at else None,
        })

    return jsonify(result), 200


@supplier_bp.route('/supplier/transport-jobs/<int:job_id>/approve-pickup', methods=['PATCH'])
@jwt_required()
@role_required('supplier')
def approve_pickup(job_id):
    try:
        user_id = current_user_id()
        job = TransportJob.query.get_or_404(job_id)

        if job.supplier_id != user_id:
            return jsonify({'message': 'Unauthorized: this job does not belong to you'}), 403

        if job.status != 'accepted':
            return jsonify({'message': 'Only accepted jobs can be approved for pickup'}), 400

        job.status = 'approved_for_pickup'
        db.session.commit()

        if job.transporter_id:
            notification = Notification(
                user_id=job.transporter_id,
                title='Pickup Approved',
                message=f'Your pickup for {job.waste_type} has been approved by the supplier.',
                type='pickup_approved'
            )
            db.session.add(notification)
            db.session.commit()

        return jsonify({
            'message': 'Pickup approved successfully',
            'job': {
                'id': job.id,
                'status': job.status,
                'waste_type': job.waste_type,
                'quantity': job.quantity,
                'pickup_location': job.pickup_location,
                'delivery_location': job.delivery_location,
            }
        }), 200

    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error in approve_pickup: {e}", exc_info=True)
        return jsonify({'message': f'Internal server error: {str(e)}'}), 500