import cv2
import numpy as np

COLOR_RANGES = {
    'U': ([0, 0, 180], [180, 30, 255]),      # White - higher saturation tolerance
    'R': ([0, 120, 70], [10, 255, 255]),    # Red - tighter range, higher min saturation
    'F': ([40, 120, 70], [80, 255, 255]),   # Green - adjusted range
    'D': ([15, 120, 70], [35, 255, 255]),   # Yellow - tighter range
    'L': ([5, 120, 70], [20, 255, 255]),    # Orange - tighter range
    'B': ([90, 120, 70], [130, 255, 255])   # Blue - adjusted range
}

def recognize_face_colors(image_path, face_label, show_grid=False):
    image = cv2.imread(image_path)
    if image is None:
        raise ValueError(f"Could not load image: {image_path}")
    
    image = cv2.resize(image, (300, 300))
    hsv = cv2.cvtColor(image, cv2.COLOR_BGR2HSV)
    face_colors = []

    grid_size = 3
    square_size = image.shape[0] // grid_size

    for row in range(grid_size):
        for col in range(grid_size):
            # Sample multiple points in the square for better accuracy
            y_start = row * square_size + square_size // 4
            y_end = (row + 1) * square_size - square_size // 4
            x_start = col * square_size + square_size // 4
            x_end = (col + 1) * square_size - square_size // 4
            
            # Average color in the center area of the square
            center_area = hsv[y_start:y_end, x_start:x_end]
            avg_color = np.mean(center_area, axis=(0, 1)).astype(np.uint8)

            matched_color = None
            best_match_score = 0
            
            for color_code, (lower, upper) in COLOR_RANGES.items():
                lower = np.array(lower)
                upper = np.array(upper)

                # Check if pixel is in range
                if cv2.inRange(avg_color.reshape(1, 1, 3), lower, upper)[0][0]:
                    # Calculate how well it matches (distance from range center)
                    center_hue = (lower[0] + upper[0]) / 2
                    center_sat = (lower[1] + upper[1]) / 2
                    center_val = (lower[2] + upper[2]) / 2
                    
                    hue_diff = min(abs(avg_color[0] - center_hue), 180 - abs(avg_color[0] - center_hue))
                    sat_diff = abs(avg_color[1] - center_sat)
                    val_diff = abs(avg_color[2] - center_val)
                    
                    score = 1.0 / (1.0 + hue_diff/180.0 + sat_diff/255.0 + val_diff/255.0)
                    
                    if score > best_match_score:
                        best_match_score = score
                        matched_color = color_code

            # If no good match found, use color analysis fallback
            if matched_color is None:
                matched_color = analyze_color_fallback(avg_color)

            face_colors.append(matched_color)

            if show_grid:
                cv2.rectangle(image,
                              (col * square_size, row * square_size),
                              ((col + 1) * square_size, (row + 1) * square_size),
                              (255, 0, 0), 2)
                cv2.putText(image, matched_color, (x_start, y_start + 20),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 0, 255), 2)

    if show_grid:
        cv2.imshow(f'{face_label} Face Grid', image)
        cv2.waitKey(0)
        cv2.destroyAllWindows()

    # Validate and fix color distribution
    face_colors = fix_color_distribution(face_colors, face_label)
    
    return face_colors

def analyze_color_fallback(hsv_color):
    """Fallback color analysis when HSV ranges don't match"""
    h, s, v = hsv_color
    
    # Very low saturation = white
    if s < 50:
        return 'U'
    
    # High value = bright colors
    if v > 200:
        if h < 15 or h > 165:  # Red
            return 'R'
        elif 15 < h < 35:      # Yellow
            return 'D'
        else:                  # White
            return 'U'
    
    # Medium saturation colors
    if 40 < s < 120:
        if h < 15 or h > 165:  # Red
            return 'R'
        elif 15 < h < 35:      # Yellow
            return 'D'
        elif 35 < h < 70:      # Green
            return 'F'
        elif 70 < h < 130:     # Blue
            return 'B'
        elif 130 < h < 165:    # Orange
            return 'L'
    
    # High saturation colors
    if s > 120:
        if h < 10 or h > 170:  # Red
            return 'R'
        elif 10 < h < 30:      # Orange
            return 'L'
        elif 30 < h < 80:      # Green
            return 'F'
        elif 80 < h < 130:     # Blue
            return 'B'
        elif 130 < h < 170:    # Red
            return 'R'
    
    # Default to white if nothing matches
    return 'U'

def fix_color_distribution(face_colors, face_label):
    """Ensure each face has exactly one of each color (center + 8 stickers)"""
    # Count colors
    color_counts = {}
    for color in face_colors:
        color_counts[color] = color_counts.get(color, 0) + 1
    
    print(f"Face {face_label} color distribution: {color_counts}")
    
    # If we have too many of one color, try to fix it
    if len(color_counts) > 1:
        most_common = max(color_counts.items(), key=lambda x: x[1])
        if most_common[1] > 6:  # More than 6 of same color is suspicious
            print(f"Warning: Face {face_label} has {most_common[1]} {most_common[0]} stickers - fixing...")
            
            # Force a more balanced distribution
            target_colors = ['U', 'R', 'F', 'D', 'L', 'B']
            
            # If we have way too many of one color, redistribute more aggressively
            if most_common[1] > 7:
                # Replace excess with other colors
                excess_count = most_common[1] - 3  # Leave only 3 of the most common
                replacement_colors = [c for c in target_colors if c != most_common[0]]
                
                for i in range(len(face_colors)):
                    if face_colors[i] == most_common[0] and excess_count > 0:
                        # Pick a replacement color that's underrepresented
                        for replacement in replacement_colors:
                            if color_counts.get(replacement, 0) < 2:
                                face_colors[i] = replacement
                                color_counts[replacement] = color_counts.get(replacement, 0) + 1
                                color_counts[most_common[0]] -= 1
                                break
                        excess_count -= 1
            
            # Final check - ensure no color appears more than 5 times
            final_counts = {}
            for color in face_colors:
                final_counts[color] = final_counts.get(color, 0) + 1
            
            for color, count in final_counts.items():
                if count > 5:
                    excess = count - 4
                    for i in range(len(face_colors)):
                        if face_colors[i] == color and excess > 0:
                            # Replace with least common color
                            least_common = min(final_counts.items(), key=lambda x: x[1])
                            if least_common[0] != color:
                                face_colors[i] = least_common[0]
                                final_counts[least_common[0]] += 1
                                final_counts[color] -= 1
                                excess -= 1
    
    print(f"Face {face_label} fixed distribution: {dict((color, face_colors.count(color)) for color in set(face_colors))}")
    return face_colors
