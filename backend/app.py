# app.py
from flask import Flask, jsonify, request
from flask_cors import CORS
from flask_jwt_extended import JWTManager, jwt_required, get_jwt_identity
from flask_mail import Mail, Message
from werkzeug.exceptions import HTTPException
import traceback
from config import Config
from database import db
from sqlalchemy import func
from datetime import datetime
import qrcode
import os
import json
from dotenv import load_dotenv

load_dotenv()

from models import (
    User,
    Collection,
    Waste,
    SupportTicket,
    TicketReply,
    Payment,
    Receipt,
    WasteListing,
    WasteRequest,
    TransportJob,
    Invoice,
    Notification,
    Conversation,
    Message as MessageModel,
    Wallet,
    WalletTransaction,
    WithdrawalRequest,
    PartnershipApplication,
)

from routes.auth import auth_bp
from routes.dashboard import dashboard_bp
from routes.supplier import supplier_bp
from routes.producer import producer_bp
from routes.transporter import transporter_bp
from routes.notifications import notifications_bp
from routes.payments import payments_bp
from routes.invoices import invoices_bp
from routes.messages import messages_bp
from routes.admin import admin_bp
from routes.wallet import wallet_bp
from routes.contact import contact_bp
from routes.tracking import tracking_bp
from routes.disputes import disputes_bp
from routes.platform_wallet import platform_wallet_bp

from services.mpesa import MpesaService

mpesa = MpesaService()


def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    # ─── CORS ────────────────────────────────────────────────────
    # Explicit origins (needed when supports_credentials=True).
    CORS(
        app,
        resources={
            r"/api/*": {
                "origins": [
                    "http://localhost:5173",
                    "http://127.0.0.1:5173",
                    "http://localhost:3000",
                    "http://127.0.0.1:3000",
                ]
            }
        },
        supports_credentials=True,
        allow_headers=["Content-Type", "Authorization"],
        expose_headers=["Content-Type", "Authorization"],
        methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    )

    db.init_app(app)
    JWTManager(app)

    # ─── Mail configuration ──────────────────────────────────────
    app.config['MAIL_SERVER'] = os.environ.get('MAIL_SERVER', 'smtp.gmail.com')
    app.config['MAIL_PORT'] = int(os.environ.get('MAIL_PORT', 587))
    app.config['MAIL_USE_TLS'] = os.environ.get('MAIL_USE_TLS', 'True').lower() == 'true'
    app.config['MAIL_USE_SSL'] = os.environ.get('MAIL_USE_SSL', 'False').lower() == 'true'
    app.config['MAIL_USERNAME'] = os.environ.get('MAIL_USERNAME')
    app.config['MAIL_PASSWORD'] = os.environ.get('MAIL_PASSWORD')
    app.config['MAIL_DEFAULT_SENDER'] = os.environ.get('MAIL_DEFAULT_SENDER')

    mail = Mail(app)
    app.extensions["mail"] = mail  # ← CRITICAL: attach for blueprints

    # ─── Register Blueprints ─────────────────────────────────────
    app.register_blueprint(auth_bp, url_prefix="/api")
    app.register_blueprint(dashboard_bp, url_prefix="/api")
    app.register_blueprint(supplier_bp, url_prefix="/api")
    app.register_blueprint(producer_bp, url_prefix="/api")
    app.register_blueprint(transporter_bp, url_prefix="/api")
    app.register_blueprint(notifications_bp, url_prefix="/api")
    app.register_blueprint(payments_bp)
    app.register_blueprint(invoices_bp, url_prefix="/api")
    app.register_blueprint(messages_bp, url_prefix="/api")
    app.register_blueprint(admin_bp)
    app.register_blueprint(wallet_bp)
    app.register_blueprint(contact_bp)
    app.register_blueprint(tracking_bp)
    app.register_blueprint(disputes_bp)
    app.register_blueprint(platform_wallet_bp)

    # ─── Helper: generate QR code ────────────────────────────────
    def generate_qr_code(payment):
        receipt_data = {
            "receipt_number": payment.receipt_number,
            "transaction_id": payment.transaction_id,
            "amount": payment.amount,
            "date": payment.completed_at.isoformat()
            if payment.completed_at
            else datetime.utcnow().isoformat(),
            "status": payment.payment_status,
        }

        qr = qrcode.QRCode(
            version=1,
            error_correction=qrcode.constants.ERROR_CORRECT_L,
            box_size=10,
            border=4,
        )

        qr.add_data(json.dumps(receipt_data))
        qr.make(fit=True)

        img = qr.make_image(fill_color="black", back_color="white")

        qr_dir = os.path.join(app.root_path, "static", "qrcodes")
        os.makedirs(qr_dir, exist_ok=True)

        filename = f"{payment.receipt_number}.png"
        filepath = os.path.join(qr_dir, filename)

        img.save(filepath)

        receipt = Receipt.query.filter_by(payment_id=payment.id).first()

        if receipt:
            receipt.qr_code_path = f"/static/qrcodes/{filename}"
            db.session.commit()

    # ─── Routes ──────────────────────────────────────────────────
    @app.route("/api/collections", methods=["GET"])
    @jwt_required()
    def get_collections():
        user_id = int(get_jwt_identity())

        try:
            collections = Collection.query.filter_by(
                supplier_id=user_id
            ).order_by(Collection.created_at.desc()).all()

            return jsonify([
                {
                    "id": c.id,
                    "waste_type": c.waste_type,
                    "quantity": c.quantity,
                    "unit": c.unit,
                    "location": c.location,
                    "address": c.address,
                    "pickup_datetime": c.pickup_datetime.isoformat()
                    if c.pickup_datetime
                    else None,
                    "created_at": c.created_at.isoformat()
                    if c.created_at
                    else None,
                    "status": c.status,
                    "special_instructions": c.special_instructions,
                    "contact_name": c.contact_name,
                    "contact_phone": c.contact_phone,
                }
                for c in collections
            ]), 200

        except Exception as e:
            print(f"Collections error: {e}")
            return jsonify([]), 200

    @app.route("/api/waste", methods=["GET"])
    @jwt_required()
    def get_waste():
        user_id = int(get_jwt_identity())

        try:
            waste = Waste.query.filter_by(
                user_id=user_id
            ).order_by(Waste.created_at.desc()).all()

            return jsonify([w.to_dict() for w in waste]), 200

        except Exception as e:
            print(f"Waste error: {e}")
            return jsonify([]), 200

    @app.route("/api/payments", methods=["GET"])
    @jwt_required()
    def get_payments():
        user_id = int(get_jwt_identity())

        try:
            payments = Payment.query.filter(
                (Payment.payer_id == user_id)
                | (Payment.supplier_id == user_id)
                | (Payment.producer_id == user_id)
                | (Payment.transporter_id == user_id)
            ).order_by(Payment.created_at.desc()).all()

            return jsonify([p.to_dict() for p in payments]), 200

        except Exception as e:
            print(f"Payments error: {e}")
            return jsonify([]), 200

    @app.route("/api/payments/summary", methods=["GET"])
    @jwt_required()
    def get_payments_summary():
        user_id = int(get_jwt_identity())

        try:
            total_earned = (
                db.session.query(func.sum(Payment.supplier_amount))
                .filter(
                    Payment.supplier_id == user_id,
                    Payment.payment_status == "completed",
                )
                .scalar()
                or 0
            )

            total_pending = (
                db.session.query(func.sum(Payment.amount))
                .filter(
                    Payment.payer_id == user_id,
                    Payment.payment_status == "pending",
                )
                .scalar()
                or 0
            )

            total_owed = (
                db.session.query(func.sum(Payment.supplier_amount))
                .filter(
                    Payment.supplier_id == user_id,
                    Payment.payment_status == "completed",
                    Payment.delivery_confirmed == False,
                )
                .scalar()
                or 0
            )

            return jsonify({
                "totalEarned": total_earned,
                "totalPending": total_pending,
                "totalOwed": total_owed,
                "currency": "KES",
            }), 200

        except Exception as e:
            print(f"Payments summary error: {e}")
            return jsonify({
                "totalEarned": 0,
                "totalPending": 0,
                "totalOwed": 0,
                "currency": "KES",
            }), 200

    @app.route("/api/payments/initiate", methods=["POST"])
    @jwt_required()
    def initiate_payment():
        user_id = int(get_jwt_identity())
        data = request.get_json() or {}

        supplier_id = data.get("supplier_id")
        amount = data.get("amount")
        phone = data.get("phone")
        description = data.get("description", "Waste collection payment")

        if not all([supplier_id, amount, phone]):
            return jsonify({"message": "Missing required fields"}), 400

        supplier = db.session.get(User, supplier_id)

        if not supplier:
            return jsonify({"message": "Supplier not found"}), 404

        payment = Payment(
            payer_id=user_id,
            supplier_id=supplier_id,
            producer_id=user_id,
            amount=amount,
            total_amount=amount,
            payment_status="pending",
            status="pending",
            escrow_status="waiting",
            phone_number=phone,
        )

        db.session.add(payment)
        db.session.commit()

        if app.config.get("MPESA_MOCK_MODE", False):
            payment.checkout_request_id = f"MOCK-{payment.id}"
            payment.merchant_request_id = f"MOCK-MERCHANT-{payment.id}"
            payment.payment_status = "completed"
            payment.status = "paid"
            payment.escrow_status = "held"
            payment.completed_at = datetime.utcnow()
            payment.mpesa_receipt = f"MOCK-RECEIPT-{payment.id}"
            payment.transaction_id = f"TXN-{payment.id}"
            payment.receipt_number = f"REV-{payment.id}"

            commission_rate = app.config.get("PLATFORM_COMMISSION_RATE", 0.05)
            payment.commission = round(payment.amount * commission_rate, 2)
            payment.supplier_amount = payment.amount - payment.commission

            db.session.commit()

            if hasattr(payment, "generate_receipt"):
                payment.generate_receipt()

            generate_qr_code(payment)

            return jsonify({
                "message": "Mock payment successful",
                "payment_id": payment.id,
                "checkout_request_id": payment.checkout_request_id,
                "status": "completed",
            }), 200

        try:
            response = mpesa.stk_push(
                phone=phone,
                amount=amount,
                transaction_id=payment.transaction_id,
                description=description,
            )

            if response.get("CheckoutRequestID"):
                payment.checkout_request_id = response["CheckoutRequestID"]
                payment.merchant_request_id = response.get("MerchantRequestID")
                db.session.commit()

                return jsonify({
                    "message": "STK Push sent. Please check your phone.",
                    "payment_id": payment.id,
                    "checkout_request_id": payment.checkout_request_id,
                    "status": "pending",
                }), 200

            payment.payment_status = "failed"
            payment.status = "failed"
            db.session.commit()

            return jsonify({
                "message": "Failed to initiate payment",
                "error": response.get("errorMessage", "Unknown error"),
            }), 400

        except Exception as e:
            payment.payment_status = "failed"
            payment.status = "failed"
            db.session.commit()

            return jsonify({
                "message": f"Payment initiation failed: {str(e)}"
            }), 500

    @app.route("/api/payments/receipt/<int:payment_id>", methods=["GET"])
    @jwt_required()
    def get_receipt(payment_id):
        user_id = int(get_jwt_identity())

        payment = db.session.get(Payment, payment_id)

        if not payment:
            return jsonify({"message": "Payment not found"}), 404

        if (
            payment.payer_id != user_id
            and payment.supplier_id != user_id
            and payment.transporter_id != user_id
            and payment.producer_id != user_id
        ):
            return jsonify({"message": "Unauthorized"}), 403

        receipt = Receipt.query.filter_by(payment_id=payment.id).first()

        if not receipt:
            return jsonify({"message": "Receipt not found"}), 404

        return jsonify({
            "payment": payment.to_dict(),
            "receipt": receipt.to_dict(),
        }), 200

    @app.route("/api/support", methods=["GET"])
    @jwt_required()
    def get_support():
        user_id = int(get_jwt_identity())

        try:
            tickets = SupportTicket.query.filter_by(
                user_id=user_id
            ).order_by(SupportTicket.created_at.desc()).all()

            result = []
            for ticket in tickets:
                ticket_dict = ticket.to_dict()
                replies = TicketReply.query.filter_by(ticket_id=ticket.id).order_by(TicketReply.created_at.asc()).all()
                ticket_dict['replies'] = [r.to_dict() for r in replies]
                result.append(ticket_dict)

            return jsonify(result), 200

        except Exception as e:
            print(f"Support error: {e}")
            return jsonify([]), 200

    @app.route("/api/support", methods=["POST"])
    @jwt_required()
    def submit_support_ticket():
        user_id = int(get_jwt_identity())
        data = request.get_json() or {}

        subject = data.get("subject", "").strip()
        message = data.get("message", "").strip()
        name = data.get("name", "").strip()
        email = data.get("email", "").strip()

        if not subject or not message:
            return jsonify({"message": "Subject and message are required"}), 400

        user = db.session.get(User, user_id)
        if not user:
            return jsonify({"message": "User not found"}), 404

        if not name:
            name = user.full_name or "Unknown"
        if not email:
            email = user.email

        ticket = SupportTicket(
            user_id=user_id,
            subject=subject,
            message=message,
            name=name,
            email=email,
            status="open"
        )

        db.session.add(ticket)
        db.session.commit()

        return jsonify({
            "message": "Support ticket submitted successfully",
            "id": ticket.id
        }), 201

    @app.route("/api/user", methods=["GET"])
    @jwt_required()
    def get_user():
        user_id = int(get_jwt_identity())
        user = db.session.get(User, user_id)

        if not user:
            return jsonify({"message": "User not found"}), 404

        return jsonify(user.to_dict()), 200

    @app.route("/api/user", methods=["PUT"])
    @jwt_required()
    def update_user():
        user_id = int(get_jwt_identity())
        user = db.session.get(User, user_id)

        if not user:
            return jsonify({"message": "User not found"}), 404

        data = request.get_json() or {}

        updatable_fields = [
            "full_name",
            "phone",
            "business_name",
            "business_type",
            "location",
            "waste_types",
        ]

        for field in updatable_fields:
            if field in data:
                setattr(user, field, data[field])

        db.session.commit()

        return jsonify({
            "message": "Profile updated successfully",
            "user": user.to_dict(),
        }), 200

    @app.route("/api/user/password", methods=["PUT"])
    @jwt_required()
    def change_password():
        data = request.get_json()
        if not data:
            return jsonify({"message": "Missing JSON payload"}), 400

        current_password = data.get("current_password")
        new_password = data.get("new_password")

        if not current_password or not new_password:
            return jsonify({"message": "Both current and new password are required"}), 400

        user_id = int(get_jwt_identity())
        user = db.session.get(User, user_id)

        if not user:
            return jsonify({"message": "User not found"}), 404

        if not user.check_password(current_password):
            return jsonify({"message": "Current password is incorrect"}), 401

        user.set_password(new_password)
        db.session.commit()

        return jsonify({"message": "Password updated successfully"}), 200

    # ─── Test email endpoint ─────────────────────────────────────
    @app.route("/api/test-email", methods=["POST"])
    def test_email():
        data = request.get_json() or {}
        email = data.get("email", "samatar578@gmail.com")
        subject = data.get("subject", "Test Email from ReVive")
        body = data.get("body", "This is a test email to verify mail configuration.")

        try:
            msg = Message(subject=subject,
                          recipients=[email],
                          body=body,
                          html=f"<p>{body}</p>")
            mail.send(msg)
            return jsonify({"message": f"Test email sent to {email}"}), 200
        except Exception as e:
            return jsonify({"message": f"Failed to send test email: {str(e)}"}), 500

    @app.route("/api/dashboard/test", methods=["GET"])
    def test_route():
        return jsonify({"message": "App is running!"}), 200

    # ─── Seed admin user ──────────────────────────────────────────
    with app.app_context():
        db.create_all()

        from routes.auth import seed_admin
        seed_admin()

        print("✅ Database tables created")
        inspector = db.inspect(db.engine)
        print("📋 Existing tables:", inspector.get_table_names())

        print("\n📋 Registered Routes:")
        for rule in app.url_map.iter_rules():
            methods = ",".join(sorted(rule.methods))
            print(f"   {rule.rule:55} [{methods}]")

        print()

    # ─── Global error handler ─────────────────────────────────────
    # Ensures CORS headers are present on 500 responses so the
    # browser can read the real error instead of "blocked by CORS policy".
    @app.errorhandler(Exception)
    def _handle_uncaught(e):
        # Let Flask handle 401/403/404 etc. normally
        if isinstance(e, HTTPException):
            return e

        # Print the full traceback to the server terminal
        traceback.print_exc()

        resp = jsonify({
            "message": str(e),
            "type": type(e).__name__,
        })
        resp.status_code = 500

        # Manually attach CORS headers so the browser doesn't mask it
        origin = request.headers.get("Origin")
        if origin:
            resp.headers["Access-Control-Allow-Origin"] = origin
            resp.headers["Access-Control-Allow-Credentials"] = "true"
            resp.headers["Vary"] = "Origin"

        return resp

    return app


if __name__ == "__main__":
    app = create_app()
    print("\n🚀 Server running on http://localhost:5000")
    app.run(debug=True, port=5000)