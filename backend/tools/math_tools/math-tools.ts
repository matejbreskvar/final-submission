import { solveEquation, solveLinearSystem, solveODE } from "./use-numpy.ts";
import { solveSymbolic, solveSymbolicSystem, differentiate, integrate } from "./use-sympy.ts";
import { plotFunctions } from "./plot.ts";
import * as path from "path";
import { fileURLToPath } from "url";

// ES Module equivalent for __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Tool definitions for LLM function calling APIs
 */
export const mathTools = [
  {
    type: "function",
    function: {
      name: "solveEquation",
      description: "Solves a mathematical equation numerically and returns the solutions",
      parameters: {
        type: "object",
        properties: {
          equation: {
            type: "string",
            description: "The equation to solve (e.g., 'x^2 - 4 = 0', 'sin(x) = 0.5')",
          },
          variable: {
            type: "string",
            description: "The variable to solve for",
            default: "x",
          },
          domain: {
            type: "array",
            description: "The domain to search for solutions [min, max]",
            items: {
              type: "number",
            },
            default: [-1000, 1000],
          },
          precision: {
            type: "integer",
            description: "Number of decimal places for solutions",
            default: 4,
          },
          method: {
            type: "string",
            description: "The method to use: 'numeric' or 'symbolic'",
            enum: ["numeric", "symbolic"],
            default: "numeric",
          },
        },
        required: ["equation"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "solveSymbolically",
      description: "Solves a mathematical equation symbolically with step-by-step explanations",
      parameters: {
        type: "object",
        properties: {
          equation: {
            type: "string",
            description: "The equation to solve (e.g., 'x^2 - 4 = 0', 'sin(x) = 0.5')",
          },
          variable: {
            type: "string",
            description: "The variable to solve for",
            default: "x",
          },
          domain: {
            type: "array",
            description: "The domain to search for solutions [min, max]",
            items: {
              type: "number",
            },
            default: [-1000, 1000],
          },
          precision: {
            type: "integer",
            description: "Number of decimal places for solutions",
            default: 4,
          },
          showSteps: {
            type: "boolean",
            description: "Whether to show step-by-step solution process",
            default: true,
          },
        },
        required: ["equation"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "solveLinearSystem",
      description: "Solves a system of linear equations numerically",
      parameters: {
        type: "object",
        properties: {
          equations: {
            type: "array",
            description: "Array of linear equations (e.g., ['2x + y = 5', 'x - y = 1'])",
            items: {
              type: "string",
            },
          },
          variables: {
            type: "array",
            description: "Variables to solve for (e.g., ['x', 'y']). If not provided, will be extracted from equations",
            items: {
              type: "string",
            },
          },
        },
        required: ["equations"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "solveLinearSystemSymbolically",
      description: "Solves a system of linear equations symbolically with step-by-step explanations",
      parameters: {
        type: "object",
        properties: {
          equations: {
            type: "array",
            description: "Array of linear equations (e.g., ['2x + y = 5', 'x - y = 1'])",
            items: {
              type: "string",
            },
          },
          variables: {
            type: "array",
            description: "Variables to solve for (e.g., ['x', 'y']). If not provided, will be extracted from equations",
            items: {
              type: "string",
            },
          },
          showSteps: {
            type: "boolean",
            description: "Whether to show step-by-step solution process",
            default: true,
          },
        },
        required: ["equations"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "differentiate",
      description: "Performs symbolic differentiation of a mathematical expression",
      parameters: {
        type: "object",
        properties: {
          expression: {
            type: "string",
            description: "The expression to differentiate (e.g., 'x^2', 'sin(x)')",
          },
          variable: {
            type: "string",
            description: "The variable to differentiate with respect to",
            default: "x",
          },
          order: {
            type: "integer",
            description: "The order of differentiation (1 for first derivative, 2 for second, etc.)",
            default: 1,
          },
          showSteps: {
            type: "boolean",
            description: "Whether to show step-by-step differentiation process",
            default: true,
          },
        },
        required: ["expression"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "integrate",
      description: "Performs symbolic integration of a mathematical expression",
      parameters: {
        type: "object",
        properties: {
          expression: {
            type: "string",
            description: "The expression to integrate (e.g., 'x^2', 'sin(x)')",
          },
          variable: {
            type: "string",
            description: "The variable to integrate with respect to",
            default: "x",
          },
          limits: {
            type: "array",
            description: "Integration limits for definite integral [lower, upper]. Omit for indefinite integration",
            items: {
              type: "number",
            },
          },
          showSteps: {
            type: "boolean",
            description: "Whether to show step-by-step integration process",
            default: true,
          },
        },
        required: ["expression"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "solveODE",
      description: "Solves an ordinary differential equation (ODE) numerically",
      parameters: {
        type: "object",
        properties: {
          equation: {
            type: "string",
            description: "The ODE to solve in the form 'dy/dx = f(x,y)' or just 'f(x,y)'",
          },
          initialCondition: {
            type: "number",
            description: "The initial value y(x0)",
            default: 0,
          },
          x0: {
            type: "number",
            description: "The starting x value",
            default: 0,
          },
          xEnd: {
            type: "number",
            description: "The ending x value",
            default: 10,
          },
          numPoints: {
            type: "integer",
            description: "Number of points in the solution",
            default: 100,
          },
          method: {
            type: "string",
            description: "The numerical method to use: 'RK45' (adaptive Runge-Kutta) or 'Euler'",
            enum: ["RK45", "Euler"],
            default: "RK45",
          },
        },
        required: ["equation"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "plotFunctions",
      description: "Creates a plot of mathematical functions",
      parameters: {
        type: "object",
        properties: {
          functions: {
            type: "array",
            description: "Array of functions to plot (e.g., ['x^2', 'sin(x)', '2*x+1'])",
            items: {
              type: "string",
            },
          },
          title: {
            type: "string",
            description: "Title of the plot",
            default: "Function Plot",
          },
          xRange: {
            type: "array",
            description: "The x-axis range [min, max]",
            items: {
              type: "number",
            },
            default: [-10, 10],
          },
          outputPath: {
            type: "string",
            description: "Path to save the plot image. If not provided, a default path will be used",
          },
        },
        required: ["functions"],
      },
    },
  },
];

/**
 * Function handler that executes the appropriate mathematical tool based on the function name and arguments
 * This can be used with LLM function calling APIs
 */
export async function handleMathToolCall(functionName: string, args: any): Promise<any> {
  try {
    switch (functionName) {
      case "solveEquation":
        return await solveEquation(args);

      case "solveSymbolically":
        return await solveSymbolic(args);

      case "solveLinearSystem":
        if (Array.isArray(args)) {
          return await solveLinearSystem(args);
        } else {
          return await solveLinearSystem(args.equations, args.variables);
        }

      case "solveLinearSystemSymbolically":
        return await solveSymbolicSystem(args);

      case "differentiate":
        return await differentiate(args.expression, args.variable || "x", args.order || 1);

      case "integrate":
        return await integrate(args.expression, args.variable || "x", args.limits);

      case "solveODE":
        return await solveODE(args);

      case "plotFunctions":
        return await plotFunctions(args);

      default:
        throw new Error(`Unknown function: ${functionName}`);
    }
  } catch (error) {
    console.error(`Error executing math tool ${functionName}:`, error);
    throw error;
  }
}
