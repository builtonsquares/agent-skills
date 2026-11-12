import os

from flask import Flask

from reports.views import bp as reports_bp


def create_app() -> Flask:
    app = Flask(__name__)
    app.config["REPORTS_DIR"] = os.environ.get("REPORTS_DIR", "/var/lib/reports")
    app.config["API_KEY"] = os.environ["REPORTS_API_KEY"]

    @app.get("/healthz")
    def healthz() -> dict[str, str]:
        return {"status": "ok"}

    app.register_blueprint(reports_bp)
    return app
