import sys
import json
import numpy as np
from scipy import optimize
from scipy.integrate import solve_ivp
import re

def preprocess_equation(equation):
    """
    Preprocess equation string to ensure proper multiplication symbols
    Converts patterns like "2x" to "2*x" for parsing
    """
    # Replace ^ with ** for Python
    equation = equation.replace('^', '**')
    
    # Regular expression to find numbers immediately followed by variables
    # Insert * between number and variable (e.g., 2x -> 2*x)
    processed = re.sub(r'(\d)([a-zA-Z])', r'\1*\2', equation)
    
    # Also handle coefficient expressions like (x)(y) -> (x)*(y)
    processed = re.sub(r'\)(\()', r')*\1', processed)
    
    return processed

def solve_equation_numeric(data):
    """Solve a single equation using numeric methods."""
    equation = data.get('equation', '')
    variable_name = data.get('variable', 'x')
    domain = data.get('domain', [-1000, 1000])
    precision = data.get('precision', 4)
    
    # Standardize equation format
    if '=' in equation:
        left, right = equation.split('=', 1)
        left = preprocess_equation(left.strip())
        right = preprocess_equation(right.strip())
        equation = f"({left}) - ({right})"
    else:
        equation = preprocess_equation(equation)
    
    solutions = []
    steps = []
    
    try:
        steps.append(f"Using numeric method to solve: {equation} = 0")
        
        # Create function to find roots
        def f(x):
            safe_globals = {
                "np": np, 
                "sin": np.sin, 
                "cos": np.cos, 
                "tan": np.tan,
                "exp": np.exp, 
                "log": np.log, 
                "sqrt": np.sqrt, 
                "pi": np.pi,
                "x": x
            }
            return eval(equation, safe_globals)
        
        # Find roots using SciPy's root finding
        x0_values = np.linspace(domain[0], domain[1], 10)  # Try multiple starting points
        
        for x0 in x0_values:
            try:
                sol = optimize.newton(f, x0)
                # Check if solution is valid and within domain
                if domain[0] <= sol <= domain[1] and abs(f(sol)) < 1e-10:
                    # Check if solution is not already in our list (within tolerance)
                    if not any(abs(s - sol) < 1e-10 for s in solutions):
                        solutions.append(round(sol, precision))
                        steps.append(f"Found solution from starting point {x0}: {sol}")
            except:
                pass  # No convergence from this starting point
        
        # If no solutions found with Newton's method, try brute force approach
        if not solutions:
            steps.append("Using brute force root finding")
            
            # Find sign changes over intervals
            x_vals = np.linspace(domain[0], domain[1], 1000)
            try:
                y_vals = [f(x) for x in x_vals]
                
                for i in range(len(y_vals)-1):
                    if y_vals[i] * y_vals[i+1] <= 0:  # Sign change indicates a root
                        a, b = x_vals[i], x_vals[i+1]
                        try:
                            sol = optimize.brentq(f, a, b)
                            solutions.append(round(sol, precision))
                            steps.append(f"Found solution in interval [{a}, {b}]: {sol}")
                        except:
                            steps.append(f"Failed to converge in interval [{a}, {b}]")
            except Exception as e:
                steps.append(f"Error in brute force approach: {str(e)}")
        
        # Remove duplicates and sort
        solutions = sorted(list(set(solutions)))
        
        return {
            "solutions": solutions,
            "expression": equation,
            "variable": variable_name,
            "steps": steps
        }
        
    except Exception as e:
        return {"error": f"Error solving equation: {str(e)}"}

def solve_linear_system_numeric(data):
    """Solve a system of linear equations using NumPy."""
    equations = data.get('equations', [])
    variables = data.get('variables', [])
    
    if not equations:
        return {"error": "No equations provided"}
    
    steps = []
    
    try:
        # Process the linear system using numpy
        A = []
        b = []
        
        # Extract variables from equations if not provided
        if not variables:
            all_vars = set()
            for eq in equations:
                vars_in_eq = set(re.findall(r'[a-zA-Z]+', eq))
                all_vars.update(vars_in_eq)
            
            # Filter out common math functions
            common_funcs = {'sin', 'cos', 'tan', 'log', 'exp', 'sqrt', 'pi'}
            variables = sorted(list(all_vars - common_funcs))
        
        steps.append(f"Variables: {variables}")
        
        # Parse equations into coefficient matrix
        for eq in equations:
            if '=' in eq:
                left, right = eq.split('=', 1)
                left = left.strip()
                right = right.strip()
            else:
                left = eq
                right = "0"
            
            left = preprocess_equation(left)
            right = preprocess_equation(right)
            steps.append(f"Processed equation: {left} = {right}")
            
            # Parse coefficients
            coeffs = [0] * len(variables)
            
            # Create coefficient extraction function for each variable
            for i, var in enumerate(variables):
                # Search for terms with the variable
                pattern = fr'([-+]?\s*\d*\.?\d*)\s*\*?\s*{var}\b'
                matches = re.findall(pattern, left)
                for match in matches:
                    match = match.strip()
                    if match in ['+', '-', '']:
                        match = match + '1'
                    coeffs[i] += float(match)
                
                # Check right side
                matches = re.findall(pattern, right)
                for match in matches:
                    match = match.strip()
                    if match in ['+', '-', '']:
                        match = match + '1'
                    coeffs[i] -= float(match)
            
            # Extract constant terms
            # Left side
            left_const_match = re.search(r'([-+]?\s*\d+\.?\d*)\s*(?![a-zA-Z])', left)
            left_const = float(left_const_match.group(1)) if left_const_match else 0
            
            # Right side
            right_const_match = re.search(r'([-+]?\s*\d+\.?\d*)\s*(?![a-zA-Z])', right)
            right_const = float(right_const_match.group(1)) if right_const_match else 0
            
            const = right_const - left_const
            
            A.append(coeffs)
            b.append(const)
            
            steps.append(f"Coefficients: {coeffs}, Constant: {const}")
        
        # Solve using NumPy
        A = np.array(A)
        b = np.array(b)
        
        steps.append(f"Coefficient matrix A:\n{A}")
        steps.append(f"Constant vector b:\n{b}")
        
        solution = np.linalg.solve(A, b)
        
        # Format result
        result = {}
        for i, var in enumerate(variables):
            result[var] = round(float(solution[i]), 6)
        
        return {
            "solution": result,
            "variables": variables,
            "matrix": A.tolist(),
            "constants": b.tolist(),
            "steps": steps
        }
        
    except np.linalg.LinAlgError:
        return {"error": "The system is singular or not uniquely solvable"}
    except Exception as e:
        return {"error": f"Error solving system: {str(e)}"}

def solve_ode(data):
    """Solve an ordinary differential equation."""
    equation = data.get('equation', '')
    initial_condition = data.get('initialCondition', 0)
    x0 = data.get('x0', 0)
    x_end = data.get('xEnd', 10)
    num_points = data.get('numPoints', 100)
    method = data.get('method', 'RK45')
    max_step = data.get('maxStep', 0.1)
    tolerance = data.get('tolerance', 1e-6)
    
    steps = []
    
    try:
        # Parse the ODE from string representation
        # Expected format: "dy/dx = f(x,y)" or just "f(x,y)"
        if '=' in equation:
            lhs, rhs = equation.split('=', 1)
            if 'dy/dx' in lhs or 'y\'' in lhs:
                equation = rhs.strip()
            else:
                equation = lhs.strip()
        
        # Preprocess the equation
        equation = preprocess_equation(equation)
        
        steps.append(f"ODE to solve: dy/dx = {equation}")
        steps.append(f"Initial condition: y({x0}) = {initial_condition}")
        steps.append(f"Integration range: [{x0}, {x_end}]")
        
        # Create the ODE function
        def ode_func(x, y):
            # Define the function using the equation string
            # This evaluates the right side of dy/dx = f(x,y)
            try:
                safe_globals = {
                    "np": np, 
                    "sin": np.sin, 
                    "cos": np.cos, 
                    "tan": np.tan,
                    "exp": np.exp, 
                    "log": np.log, 
                    "sqrt": np.sqrt, 
                    "pi": np.pi,
                    "x": x, 
                    "y": y[0] if isinstance(y, np.ndarray) else y
                }
                return np.array([eval(equation, safe_globals)])
            except Exception as e:
                print(f"Error evaluating ODE at x={x}, y={y}: {str(e)}", file=sys.stderr)
                return np.array([np.nan])
        
        # Solve the ODE
        if method == 'RK45':
            steps.append("Using Runge-Kutta 4(5) method with adaptive step size")
            steps.append(f"Tolerance: {tolerance}")
            
            # Use SciPy's solve_ivp with RK45 method
            result = solve_ivp(
                ode_func,
                [x0, x_end],
                [initial_condition],
                method='RK45',
                max_step=max_step,
                rtol=tolerance,
                atol=tolerance,
                dense_output=True
            )
            
            # Check if solution was successful
            if not result.success:
                return {"error": f"ODE solver failed: {result.message}"}
            
            steps.append(f"ODE solver status: {result.message}")
            steps.append(f"Function evaluations: {result.nfev}")
            
            # Generate evenly spaced points for the output
            t_eval = np.linspace(x0, x_end, num_points)
            y_sol = result.sol(t_eval)[0]  # Extract solution values
            
            return {
                "x": t_eval.tolist(),
                "y": y_sol.tolist(),
                "equation": equation,
                "method": "RK45",
                "success": True,
                "message": result.message,
                "steps": steps
            }
            
        elif method == 'Euler':
            steps.append("Using Euler's method with fixed step size")
            
            # Calculate step size
            h = (x_end - x0) / (num_points - 1)
            steps.append(f"Step size: {h}")
            
            # Implement Euler's method manually
            x_values = np.linspace(x0, x_end, num_points)
            y_values = np.zeros(num_points)
            
            # Initial condition
            y_values[0] = initial_condition
            
            # Euler integration loop
            for i in range(1, num_points):
                x = x_values[i-1]
                y = y_values[i-1]
                
                # Euler step: y_next = y + h * f(x, y)
                slope = ode_func(x, y)[0]
                y_values[i] = y + h * slope
            
            return {
                "x": x_values.tolist(),
                "y": y_values.tolist(),
                "equation": equation,
                "method": "Euler",
                "success": True,
                "message": "Solution computed using Euler's method",
                "steps": steps
            }
            
        else:
            return {"error": f"Unsupported method: {method}"}
        
    except Exception as e:
        return {"error": f"Error solving ODE: {str(e)}"}

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"error": "No input data provided"}))
        sys.exit(1)
    
    try:
        data = json.loads(sys.argv[1])
        
        if data.get('type') == 'linear_system':
            result = solve_linear_system_numeric(data)
        elif data.get('type') == 'ode':
            result = solve_ode(data)
        else:
            result = solve_equation_numeric(data)
            
        print(json.dumps(result))
    except Exception as e:
        print(json.dumps({"error": f"Error processing input: {str(e)}"}))
        sys.exit(1)