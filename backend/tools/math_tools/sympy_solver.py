import sys
import json
import re
from sympy import symbols, sympify, solve, Eq, factor, expand, collect, simplify, together
from sympy import sin, cos, tan, exp, log, sqrt, pi, Symbol, Rational, S, diff, integrate as sympy_integrate
from sympy.core.sympify import SympifyError
from sympy.solvers.solvers import _invert
from sympy.integrals.manualintegrate import integral_steps
from sympy.printing.str import StrPrinter

def preprocess_equation(equation):
    """
    Preprocess equation string to ensure proper multiplication symbols
    Converts patterns like "2x" to "2*x" for SymPy parsing
    """
    # Replace ^ with ** for Python
    equation = equation.replace('^', '**')
    
    # Regular expression to find numbers immediately followed by variables
    # Insert * between number and variable (e.g., 2x -> 2*x)
    processed = re.sub(r'(\d)([a-zA-Z])', r'\1*\2', equation)
    
    # Also handle coefficient expressions like (x)(y) -> (x)*(y)
    processed = re.sub(r'\)(\()', r')*\1', processed)
    
    return processed

def generate_equation_steps(expr, var):
    """Generate step-by-step solution for an equation."""
    steps = []
    
    # Detect equation type
    is_polynomial = expr.is_polynomial(var)
    has_trig = any(func in str(expr) for func in ["sin", "cos", "tan"])
    has_log = "log" in str(expr)
    has_exp = "exp" in str(expr)
    
    steps.append(f"Starting with expression: {expr} = 0")
    
    # Step 1: Simplify if needed
    simple_expr = simplify(expr)
    if simple_expr != expr:
        steps.append(f"Simplifying: {simple_expr} = 0")
        expr = simple_expr
    
    # Handle polynomial equations with detailed steps
    if is_polynomial:
        degree = expr.as_poly(var).degree()
        steps.append(f"This is a polynomial equation of degree {degree}")
        
        # Rearrange to standard form
        expr_collected = collect(expr, var)
        if expr_collected != expr:
            steps.append(f"Rearranging to standard form: {expr_collected} = 0")
            expr = expr_collected
        
        # Factor if possible
        try:
            factored = factor(expr)
            if factored != expr:
                steps.append(f"Factoring: {factored} = 0")
                
                # Explain the zero-product property
                if '*' in str(factored):
                    steps.append("Using the zero-product property: if a*b = 0, then either a = 0 or b = 0")
                    factors = str(factored).replace('(', '').replace(')', '').split('*')
                    for f in factors:
                        steps.append(f"Solving {f} = 0")
        except:
            steps.append("Could not factor further")
        
        # Special handling for common degrees
        if degree == 1:
            steps.append("For linear equations ax + b = 0, the solution is x = -b/a")
            # Try to solve manually
            coeffs = expr.as_poly(var).all_coeffs()
            if len(coeffs) == 2:  # ax + b
                a, b = coeffs
                steps.append(f"Here a = {a} and b = {b}")
                steps.append(f"Substituting: x = {-b}/{a} = {-b/a}")
                
        elif degree == 2:
            steps.append("For quadratic equations ax² + bx + c = 0, we can use the quadratic formula:")
            steps.append("x = (-b ± √(b² - 4ac)) / (2a)")
            
            # Extract coefficients
            quadratic = expr.as_poly(var)
            c, b, a = quadratic.all_coeffs() if len(quadratic.all_coeffs()) == 3 else (quadratic.all_coeffs()[0], 0, 0)
            
            steps.append(f"Here a = {a}, b = {b}, c = {c}")
            discriminant = b**2 - 4*a*c
            steps.append(f"Calculate the discriminant: b² - 4ac = {discriminant}")
            
            if discriminant > 0:
                steps.append("Discriminant > 0, so there are two real solutions")
                steps.append(f"x₁ = ({-b} + √{discriminant}) / {2*a} = {(-b + sqrt(discriminant))/(2*a)}")
                steps.append(f"x₂ = ({-b} - √{discriminant}) / {2*a} = {(-b - sqrt(discriminant))/(2*a)}")
            elif discriminant == 0:
                steps.append("Discriminant = 0, so there is one repeated solution")
                steps.append(f"x = {-b} / {2*a} = {-b/(2*a)}")
            else:
                steps.append("Discriminant < 0, so there are two complex solutions")
    
    # Handle trigonometric equations
    elif has_trig:
        steps.append("This is a trigonometric equation")
        steps.append("For trigonometric equations, I'll look for values where the expression equals zero")
        
        # Try to simplify trig expressions
        simple_trig = simplify(expr)
        if simple_trig != expr:
            steps.append(f"Simplifying trigonometric expression: {simple_trig} = 0")
            expr = simple_trig
    
    # Handle logarithmic equations
    elif has_log:
        steps.append("This is a logarithmic equation")
        steps.append("For logarithmic equations, I'll apply properties of logarithms to isolate the variable")
        
        # Try to simplify log expressions
        simple_log = simplify(expr)
        if simple_log != expr:
            steps.append(f"Simplifying logarithmic expression: {simple_log} = 0")
            expr = simple_log
    
    # Handle exponential equations
    elif has_exp:
        steps.append("This is an exponential equation")
        steps.append("For exponential equations, I'll apply properties of exponents to isolate the variable")
        
        # Try to simplify exponential expressions
        simple_exp = simplify(expr)
        if simple_exp != expr:
            steps.append(f"Simplifying exponential expression: {simple_exp} = 0")
            expr = simple_exp
    
    # General approach for other equation types
    else:
        steps.append("General approach: isolating the variable")
        
        # Try algebraic manipulation through inversion (works for some simple cases)
        try:
            if var in expr.free_symbols:
                # Very simple attempt to isolate var using _invert
                # This won't work for complex expressions but helps in basic cases
                lhs, rhs = _invert(expr, 0, var)
                if lhs == var:
                    steps.append(f"Isolating {var}: {var} = {rhs}")
        except:
            steps.append("Could not isolate variable directly")
    
    # Final step - mention the solve function
    steps.append("Finally, solving the equation using SymPy's solve function")
    
    return steps

def solve_symbolic_equation(data):
    """Solve a single equation symbolically with step-by-step explanations."""
    equation = data.get('equation', '')
    variable_name = data.get('variable', 'x')
    domain = data.get('domain', [-1000, 1000])
    precision = data.get('precision', 4)
    show_steps = data.get('showSteps', True)
    
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
        # Solve using SymPy (symbolic)
        steps.append(f"Using symbolic method to solve: {equation} = 0")
        
        var = symbols(variable_name)
        expr = sympify(equation)
        steps.append(f"Expression parsed as: {expr}")
        
        # Generate detailed solution steps if requested
        if show_steps:
            steps.extend(generate_equation_steps(expr, var))
        
        symbolic_solutions = solve(expr, var)
        steps.append(f"Raw solutions: {symbolic_solutions}")
        
        # Convert solutions to float and filter out complex solutions
        for sol in symbolic_solutions:
            try:
                float_sol = float(sol)
                # Check if solution is within domain
                if domain[0] <= float_sol <= domain[1]:
                    solutions.append(round(float_sol, precision))
                    steps.append(f"Validated solution: {float_sol}")
            except (TypeError, ValueError):
                # This happens with complex solutions
                if hasattr(sol, 'is_real') and sol.is_real:
                    try:
                        float_sol = float(sol)
                        if domain[0] <= float_sol <= domain[1]:
                            solutions.append(round(float_sol, precision))
                            steps.append(f"Validated real solution: {float_sol}")
                    except:
                        steps.append(f"Skipping non-numeric solution: {sol}")
                else:
                    steps.append(f"Skipping complex solution: {sol}")
        
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

def solve_symbolic_system(data):
    """Solve a system of equations symbolically with step-by-step explanations."""
    equations = data.get('equations', [])
    variables = data.get('variables', [])
    show_steps = data.get('showSteps', True)
    
    if not equations:
        return {"error": "No equations provided"}
    
    steps = []
    
    try:
        # If no variables provided, try to extract them from equations
        if not variables:
            all_vars = set()
            for eq in equations:
                # Find all alphabetic variables in the equation
                vars_in_eq = set(re.findall(r'[a-zA-Z]+', eq))
                all_vars.update(vars_in_eq)
            
            # Filter out common math functions
            common_funcs = {'sin', 'cos', 'tan', 'log', 'exp', 'sqrt', 'pi'}
            variables = sorted(list(all_vars - common_funcs))
        
        steps.append(f"Variables to solve for: {', '.join(variables)}")
        steps.append(f"System of {len(equations)} equations:")
        for i, eq in enumerate(equations):
            steps.append(f"Equation {i+1}: {eq}")
        
        # Convert to SymPy equations
        sym_vars = symbols(' '.join(variables))
        if not isinstance(sym_vars, tuple):
            sym_vars = (sym_vars,)
        
        sym_eqs = []
        for eq in equations:
            if '=' in eq:
                left, right = eq.split('=', 1)
                left = preprocess_equation(left.strip())
                right = preprocess_equation(right.strip())
                sym_eqs.append(Eq(sympify(left), sympify(right)))
                steps.append(f"Parsed equation: {sym_eqs[-1]}")
            else:
                # If no equals sign, assume right side is 0
                expr = preprocess_equation(eq.strip())
                sym_eqs.append(Eq(sympify(expr), 0))
                steps.append(f"Parsed equation: {sym_eqs[-1]}")
        
        # Solve the system symbolically
        steps.append("Solving the system symbolically using SymPy's solve function")
        sol = solve(sym_eqs, sym_vars, dict=True)
        
        if not sol:
            return {"error": "No solution found for the system"}
        
        # Use the first solution (in case of multiple solutions)
        result = {}
        for i, var in enumerate(variables):
            sym_var = sym_vars[i] if isinstance(sym_vars, tuple) else sym_vars
            value = sol[0][sym_var]
            try:
                result[var] = float(value)
                steps.append(f"Solution for {var} = {value} ≈ {float(value)}")
            except:
                result[var] = str(value)
                steps.append(f"Solution for {var} = {value} (symbolic)")
        
        return {
            "solution": result,
            "variables": variables,
            "steps": steps if show_steps else None
        }
        
    except Exception as e:
        return {"error": f"Error solving system: {str(e)}"}

def perform_differentiation(data):
    """Perform symbolic differentiation with steps."""
    expression = data.get('expression', '')
    variable = data.get('variable', 'x')
    order = data.get('order', 1)
    show_steps = data.get('showSteps', True)
    
    steps = []
    
    try:
        # Preprocess the expression
        expression = preprocess_equation(expression)
        
        # Parse the expression
        var = symbols(variable)
        expr = sympify(expression)
        
        steps.append(f"Expression to differentiate: {expr}")
        steps.append(f"With respect to: {variable}")
        steps.append(f"Order of differentiation: {order}")
        
        # First order derivative
        if order == 1:
            steps.append("Using the basic differentiation rules:")
            
            # Attempt to show chain rule, product rule, etc.
            terms = expr.as_ordered_terms()
            if len(terms) > 1:
                steps.append("Using the sum rule: d/dx[f(x) + g(x)] = d/dx[f(x)] + d/dx[g(x)]")
                for term in terms:
                    steps.append(f"Differentiating term: {term}")
                    if term.has(var):
                        if term.is_Pow:
                            base, exp = term.as_base_exp()
                            if base == var and exp.is_constant():
                                steps.append(f"Using power rule: d/dx[x^n] = n·x^(n-1)")
                                steps.append(f"d/dx[{term}] = {exp}·{var}^{exp-1} = {diff(term, var)}")
                        elif term.is_Mul:
                            factors = term.as_ordered_factors()
                            var_factors = [f for f in factors if f.has(var)]
                            if var_factors:
                                steps.append(f"Using product rule or chain rule as appropriate")
                    else:
                        steps.append(f"Constant term, derivative is 0")
        
        # Compute the derivative
        result = diff(expr, var, order)
        steps.append(f"Result of differentiation: {result}")
        
        # Simplify if possible
        simplified = simplify(result)
        if simplified != result:
            steps.append(f"Simplifying: {simplified}")
            result = simplified
        
        return {
            "original": str(expr),
            "derivative": str(result),
            "variable": variable,
            "order": order,
            "steps": steps if show_steps else None
        }
        
    except Exception as e:
        return {"error": f"Error in differentiation: {str(e)}"}

def perform_integration(data):
    """Perform symbolic integration with steps."""
    expression = data.get('expression', '')
    variable = data.get('variable', 'x')
    limits = data.get('limits', None)
    show_steps = data.get('showSteps', True)
    
    steps = []
    
    try:
        # Preprocess the expression
        expression = preprocess_equation(expression)
        
        # Parse the expression
        var = symbols(variable)
        expr = sympify(expression)
        
        steps.append(f"Expression to integrate: {expr}")
        steps.append(f"With respect to: {variable}")
        
        if limits:
            steps.append(f"Definite integral with limits: [{limits[0]}, {limits[1]}]")
        else:
            steps.append("Indefinite integral (antiderivative)")
        
        # Try to get detailed integration steps using manualintegrate
        try:
            integration_steps = integral_steps(expr, var)
            steps.append("Integration method:")
            steps.append(str(integration_steps))
        except Exception as e:
            steps.append(f"Detailed integration steps unavailable: {str(e)}")
            steps.append("Proceeding with direct integration...")
        
        # Compute the integral
        if limits:
            lower, upper = limits
            lower_sym = sympify(lower)
            upper_sym = sympify(upper)
            result = sympy_integrate(expr, (var, lower_sym, upper_sym))
            steps.append(f"Result of definite integration: {result}")
        else:
            result = sympy_integrate(expr, var)
            steps.append(f"Result of indefinite integration: {result} + C")
            steps.append("(where C is an arbitrary constant)")
        
        # Simplify if possible
        simplified = simplify(result)
        if simplified != result:
            steps.append(f"Simplifying: {simplified}")
            result = simplified
        
        return {
            "original": str(expr),
            "integral": str(result),
            "variable": variable,
            "limits": limits,
            "steps": steps if show_steps else None
        }
        
    except Exception as e:
        return {"error": f"Error in integration: {str(e)}"}

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"error": "No input data provided"}))
        sys.exit(1)
    
    try:
        data = json.loads(sys.argv[1])
        
        operation_type = data.get('type', 'solve')
        
        if operation_type == 'system':
            result = solve_symbolic_system(data)
        elif operation_type == 'differentiate':
            result = perform_differentiation(data)
        elif operation_type == 'integrate':
            result = perform_integration(data)
        else:
            result = solve_symbolic_equation(data)
            
        print(json.dumps(result))
    except Exception as e:
        print(json.dumps({"error": f"Error processing input: {str(e)}"}))
        sys.exit(1)