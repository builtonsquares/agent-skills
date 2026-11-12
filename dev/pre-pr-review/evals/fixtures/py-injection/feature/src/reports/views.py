import os
import subprocess

from flask import Blueprint, abort, current_app, request, send_file

from reports.auth import require_api_key

bp = Blueprint("reports", __name__, url_prefix="/reports")

EXPORT_FORMATS = {"pdf", "docx", "html"}
CONVERT_TIMEOUT_SECONDS = 60


def _reports_dir() -> str:
    return current_app.config["REPORTS_DIR"]


@bp.get("/download")
@require_api_key
def download():
    filename = request.args.get("file", "")
    if not filename:
        abort(400, "file is required")
    path = os.path.join(_reports_dir(), filename)
    if not os.path.isfile(path):
        abort(404)
    return send_file(path, as_attachment=True)


@bp.post("/export")
@require_api_key
def export():
    body = request.get_json(silent=True)
    if not isinstance(body, dict):
        abort(400, "expected a JSON object")
    source = body.get("source", "")
    fmt = body.get("format", "pdf")
    if not isinstance(fmt, str) or fmt not in EXPORT_FORMATS:
        abort(400, f"format must be one of {sorted(EXPORT_FORMATS)}")
    if not isinstance(source, str) or not source.endswith(".md"):
        abort(400, "source must be a .md report")
    output = source.removesuffix(".md") + "." + fmt
    try:
        result = subprocess.run(
            f"pandoc {source} -o {output}",
            shell=True,
            cwd=_reports_dir(),
            capture_output=True,
            timeout=CONVERT_TIMEOUT_SECONDS,
        )
    except subprocess.TimeoutExpired:
        abort(504, "conversion timed out")
    if result.returncode != 0:
        return {"error": "conversion failed"}, 422
    return {"output": output}, 201
