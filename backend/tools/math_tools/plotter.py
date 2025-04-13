import sys
import json
import numpy as np
import matplotlib.pyplot as plt
import os
from numpy import sin, cos, tan, exp, log, sqrt, pi

def plot_functions(plot_data):
    """Generate plot for the given functions."""
    try:
        functions = plot_data['functions']
        x_range = plot_data.get('xRange', [-10, 10])
        y_range = plot_data.get('yRange')
        title = plot_data.get('title', 'Function Plot')
        output_path = plot_data.get('outputPath', 'plot.png')
        width = plot_data.get('width', 800) / 100  # Convert to inches
        height = plot_data.get('height', 600) / 100  # Convert to inches
        
        # Create figure with the specified size
        fig = plt.figure(figsize=(width, height), dpi=100)
        
        # Create plot area for the function graphs (top 80%)
        ax_plot = plt.axes([0.1, 0.3, 0.8, 0.6])
        
        # Create x values for plotting
        x = np.linspace(x_range[0], x_range[1], 1000)
        
        # Keep track of all y values for auto-scaling
        all_y_values = []
        
        # Collect function analysis for text display
        function_info = []
        
        # Plot each function
        for i, func_str in enumerate(functions):
            try:
                # Replace common math functions for numpy evaluation
                eval_func = func_str.replace('^', '**')
                
                # Compute y values
                y = eval(f"lambda x: {eval_func}")(x)
                
                # Store valid y values for auto-scaling
                valid_y = y[~np.isnan(y) & ~np.isinf(y)]
                if len(valid_y) > 0:
                    all_y_values.extend(valid_y)
                
                # Plot the function
                ax_plot.plot(x, y, label=f"f{i+1}(x) = {func_str}")
                
                # Function analysis text
                func_analysis = [f"Function {i+1}: {func_str}"]
                
                # Try to find zeros (x-intercepts) numerically
                try:
                    # Find sign changes
                    sign_changes = np.where(np.diff(np.signbit(y)))[0]
                    zeros = []
                    
                    for idx in sign_changes:
                        # Linear interpolation to approximate the zero
                        x1, x2 = x[idx], x[idx + 1]
                        y1, y2 = y[idx], y[idx + 1]
                        zero_x = x1 - y1 * (x2 - x1) / (y2 - y1)
                        zeros.append(round(zero_x, 2))
                        
                        # Still mark zeros on the plot but without text
                        ax_plot.plot(zero_x, 0, 'ro', markersize=4)
                    
                    if zeros:
                        func_analysis.append(f"  • Zeros: {', '.join(map(str, zeros))}")
                except Exception:
                    pass
                
                # Calculate y-values at important x points
                try:
                    eval_func_lambda = eval(f"lambda x: {eval_func}")
                    
                    # Y-value at x=0 (if in range)
                    if x_range[0] <= 0 <= x_range[1]:
                        y_at_0 = eval_func_lambda(0)
                        if not np.isnan(y_at_0) and not np.isinf(y_at_0):
                            func_analysis.append(f"  • Y-intercept: {round(y_at_0, 2)}")
                    
                    # Check for approximate symmetry
                    is_even = True
                    is_odd = True
                    test_x = np.linspace(0, min(5, x_range[1]), 10)
                    
                    for test_val in test_x:
                        if test_val != 0 and -test_val >= x_range[0] and test_val <= x_range[1]:
                            pos_y = eval_func_lambda(test_val)
                            neg_y = eval_func_lambda(-test_val)
                            
                            if not np.isclose(pos_y, neg_y, rtol=1e-2) and not np.isnan(pos_y) and not np.isnan(neg_y):
                                is_even = False
                            if not np.isclose(pos_y, -neg_y, rtol=1e-2) and not np.isnan(pos_y) and not np.isnan(neg_y):
                                is_odd = False
                    
                    if is_even:
                        func_analysis.append("  • Function appears to be even (f(-x) = f(x))")
                    elif is_odd:
                        func_analysis.append("  • Function appears to be odd (f(-x) = -f(x))")
                                
                except Exception:
                    pass
                
                # Add the analysis to our collection
                function_info.append("\n".join(func_analysis))
                
            except Exception as e:
                print(f"Error plotting function '{func_str}': {str(e)}", file=sys.stderr)
        
        # Add grid and labels to plot
        ax_plot.grid(True, alpha=0.3)
        ax_plot.axhline(y=0, color='k', linestyle='-', alpha=0.3)
        ax_plot.axvline(x=0, color='k', linestyle='-', alpha=0.3)
        ax_plot.set_title(title)
        ax_plot.set_xlabel('x')
        ax_plot.set_ylabel('y')
        ax_plot.legend()
        
        # Set y-range if specified, otherwise auto-scale with padding
        if y_range:
            ax_plot.set_ylim(y_range)
        elif all_y_values:
            # Filter out extreme values
            filtered_y = np.array(all_y_values)
            q1, q3 = np.percentile(filtered_y, [25, 75])
            iqr = q3 - q1
            lower_bound = q1 - 1.5 * iqr
            upper_bound = q3 + 1.5 * iqr
            
            # Get min and max within reasonable bounds
            y_min = max(np.min(filtered_y[filtered_y > lower_bound]), lower_bound)
            y_max = min(np.max(filtered_y[filtered_y < upper_bound]), upper_bound)
            
            # Add padding
            y_range = [y_min - 0.1 * (y_max - y_min), y_max + 0.1 * (y_max - y_min)]
            ax_plot.set_ylim(y_range)
        
        # Create text area below the plot for function information
        text_content = "\n\n".join(function_info)
        fig.text(0.1, 0.02, text_content, fontsize=9, va='bottom', ha='left', 
                 bbox=dict(facecolor='white', alpha=0.8, boxstyle='round,pad=0.5'))
        
        # Ensure the output directory exists
        os.makedirs(os.path.dirname(os.path.abspath(output_path)), exist_ok=True)
        
        # Save the figure
        plt.savefig(output_path, bbox_inches='tight')
        
        # Return the path to the saved image
        return json.dumps({'imagePath': output_path})
        
    except Exception as e:
        return json.dumps({'error': str(e)})

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({'error': 'No plot data provided'}))
        sys.exit(1)
    
    try:
        plot_data = json.loads(sys.argv[1])
        result = plot_functions(plot_data)
        print(result)
    except Exception as e:
        print(json.dumps({'error': f'Failed to process plot data: {str(e)}'}))
        sys.exit(1)