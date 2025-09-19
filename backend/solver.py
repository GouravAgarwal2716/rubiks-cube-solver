from color_recognition import recognize_face_colors
from typing import Dict, List

MOVE_NAME = {
    "U": "Rotate Up face clockwise",
    "U'": "Rotate Up face counter-clockwise",
    "U2": "Rotate Up face 180°",
    "D": "Rotate Down face clockwise",
    "D'": "Rotate Down face counter-clockwise",
    "D2": "Rotate Down face 180°",
    "L": "Rotate Left face clockwise",
    "L'": "Rotate Left face counter-clockwise",
    "L2": "Rotate Left face 180°",
    "R": "Rotate Right face clockwise",
    "R'": "Rotate Right face counter-clockwise",
    "R2": "Rotate Right face 180°",
    "F": "Rotate Front face clockwise",
    "F'": "Rotate Front face counter-clockwise",
    "F2": "Rotate Front face 180°",
    "B": "Rotate Back face clockwise",
    "B'": "Rotate Back face counter-clockwise",
    "B2": "Rotate Back face 180°",
}

def _orientation_hint(move: str) -> str:
    # Holding guide based on standard orientation: U on top, F facing you
    base = {
        'U': "Keep white (U) on top; turn the top layer.",
        'D': "Keep white (U) on top; turn the bottom layer.",
        'L': "Left face on your left; turn left layer.",
        'R': "Right face on your right; turn right layer.",
        'F': "Front face towards you; turn front layer.",
        'B': "Back face away from you; turn back layer.",
    }
    face = move[0]
    return base.get(face, "Perform the indicated move while keeping U on top and F in front.")

def solve_cube_from_images(image_paths: Dict[str, str]) -> Dict[str, object]:
    # Expect image_paths as dict: {'U': 'path/to/U.png', 'F': 'path/to/F.png', ...}
    cube_state = ''
    face_order = ['U', 'R', 'F', 'D', 'L', 'B']

    for face in face_order:
        colors = recognize_face_colors(image_paths[face], face)
        cube_state += ''.join(colors)

    # Validate and fix the entire cube state
    cube_state = validate_and_fix_cube_state(cube_state)

    # Backend now only returns the detected cube_state; solving happens on the frontend
    return {
        'cube_state': cube_state
    }

def validate_and_fix_cube_state(cube_state: str) -> str:
    """Ensure the cube state has exactly 9 of each color"""
    if len(cube_state) != 54:
        raise ValueError(f"Cube state must be 54 characters, got {len(cube_state)}")
    
    # Count each color
    color_counts = {}
    for color in cube_state:
        color_counts[color] = color_counts.get(color, 0) + 1
    
    print(f"Original cube state color counts: {color_counts}")
    
    # Check if we have exactly 9 of each color
    expected_colors = ['U', 'R', 'F', 'D', 'L', 'B']
    for color in expected_colors:
        if color not in color_counts:
            color_counts[color] = 0
    
    # If any color count is wrong, fix it
    needs_fixing = any(count != 9 for count in color_counts.values())
    
    if needs_fixing:
        print("Fixing cube state color distribution...")
        cube_list = list(cube_state)
        
        # Strategy: redistribute colors to get exactly 9 of each
        for target_color in expected_colors:
            current_count = color_counts[target_color]
            
            if current_count > 9:
                # Too many - replace excess with underrepresented colors
                excess = current_count - 9
                for i in range(len(cube_list)):
                    if cube_list[i] == target_color and excess > 0:
                        # Find a color that needs more
                        for replacement_color in expected_colors:
                            if color_counts[replacement_color] < 9:
                                cube_list[i] = replacement_color
                                color_counts[target_color] -= 1
                                color_counts[replacement_color] += 1
                                excess -= 1
                                break
            
            elif current_count < 9:
                # Too few - find excess colors to replace
                needed = 9 - current_count
                for i in range(len(cube_list)):
                    if needed <= 0:
                        break
                    # Find a color with excess
                    for excess_color in expected_colors:
                        if color_counts[excess_color] > 9:
                            if cube_list[i] == excess_color:
                                cube_list[i] = target_color
                                color_counts[excess_color] -= 1
                                color_counts[target_color] += 1
                                needed -= 1
                                break
        
        cube_state = ''.join(cube_list)
        
        # Final validation
        final_counts = {}
        for color in cube_state:
            final_counts[color] = final_counts.get(color, 0) + 1
        print(f"Fixed cube state color counts: {final_counts}")
        
        # Ensure we have exactly 9 of each
        for color in expected_colors:
            if final_counts.get(color, 0) != 9:
                print(f"Warning: Still have {final_counts.get(color, 0)} {color} stickers")
    
    return cube_state
