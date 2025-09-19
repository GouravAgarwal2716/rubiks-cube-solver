from flask import Flask, request, jsonify
from werkzeug.utils import secure_filename
from flask_cors import CORS
import os
from solver import solve_cube_from_images

app = Flask(__name__)
CORS(app)

UPLOAD_DIR = os.path.join(os.path.dirname(__file__), 'uploaded_images')
os.makedirs(UPLOAD_DIR, exist_ok=True)

@app.route('/solve', methods=['POST'])
def solve():
    # Accept either JSON with paths or multipart file upload
    if request.content_type and request.content_type.startswith('application/json'):
        image_paths = request.json.get('images', {})
    else:
        # Expect files with keys: U, R, F, D, L, B
        image_paths = {}
        required_faces = ['U', 'R', 'F', 'D', 'L', 'B']
        for face in required_faces:
            file = request.files.get(face)
            if not file:
                return jsonify({'error': f'Missing image for face {face}'}), 400
            filename = secure_filename(f"{face}.png")
            filepath = os.path.join(UPLOAD_DIR, filename)
            file.save(filepath)
            image_paths[face] = filepath

    result = solve_cube_from_images(image_paths)
    print(f"Detected Cube State: {result.get('cube_state', '')}")
    return jsonify(result)

if __name__ == '__main__':
    app.run(debug=True)
