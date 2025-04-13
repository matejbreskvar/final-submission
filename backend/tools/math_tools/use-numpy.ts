import { spawn } from "child_process";
import * as path from "path";
import * as fs from "fs";
import { fileURLToPath } from "url";

// ES Module equivalent for __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface SolveOptions {
  equation: string; // Equation to solve (e.g., "x^2 - 4 = 0")
  variable?: string; // Variable to solve for (default: "x")
  domain?: [number, number]; // Domain to search for solutions
  method?: "symbolic" | "numeric"; // Solution method
  precision?: number; // Number of decimal places in results
}

interface SolveResult {
  solutions: number[]; // Numerical solutions
  expression: string; // Original expression
  variable: string; // Variable solved for
  steps?: string[]; // Optional steps used to find solution
}

interface ODEOptions {
  equation: string; // Differential equation in the form "dy/dx = f(x,y)"
  initialCondition: number; // Initial value of y at x0
  x0: number; // Starting x value
  xEnd: number; // Ending x value
  numPoints?: number; // Number of points to return
  method?: "RK45" | "Euler"; // Solving method (default: RK45)
  maxStep?: number; // Maximum step size
  tolerance?: number; // Error tolerance
}

interface ODEResult {
  x: number[]; // x values
  y: number[]; // y values
  equation: string; // Original equation
  method: string; // Method used
  success: boolean; // Whether the solution was successful
  message?: string; // Additional information
}

/**
 * Solves mathematical equations using a Python subprocess with NumPy/SciPy
 * @param options SolveOptions configuration
 * @returns Promise with the solution result
 */
export async function solveEquation(options: SolveOptions): Promise<SolveResult> {
  const defaultOptions = {
    variable: "x",
    domain: [-1000, 1000],
    method: "symbolic",
    precision: 4,
  };

  // Merge default options with provided options
  const config = { ...defaultOptions, ...options };

  // Format the data to be passed to Python
  const solveData = JSON.stringify(config);

  // Get the path to the Python script
  const pythonScriptPath = path.join(__dirname, "numpy_solver.py");

  return new Promise((resolve, reject) => {
    // Spawn the Python process
    const pythonProcess = spawn("python", [pythonScriptPath, solveData]);

    let resultData = "";
    let errorData = "";

    // Collect output from the Python script
    pythonProcess.stdout.on("data", (data) => {
      resultData += data.toString();
    });

    // Collect error output
    pythonProcess.stderr.on("data", (data) => {
      errorData += data.toString();
    });

    // Handle process completion
    pythonProcess.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(`Python process exited with code ${code}. Error: ${errorData}`));
        return;
      }

      try {
        const result = JSON.parse(resultData.trim());
        if (result.error) {
          reject(new Error(result.error));
        } else {
          resolve(result);
        }
      } catch (err) {
        reject(new Error(`Failed to parse Python output: ${resultData}`));
      }
    });
  });
}

/**
 * Solves a system of linear equations
 * @param equations Array of equations (e.g., ["2x + 3y = 5", "x - y = 1"])
 * @param variables Array of variables to solve for (e.g., ["x", "y"])
 * @returns Promise with the solution result
 */
export async function solveLinearSystem(equations: string[], variables?: string[]): Promise<Record<string, number>> {
  const config = {
    type: "linear_system",
    equations,
    variables: variables || equations.map((_, i) => String.fromCharCode(120 + i)), // x, y, z, ...
  };

  // Format the data to be passed to Python
  const solveData = JSON.stringify(config);

  // Get the path to the Python script
  const pythonScriptPath = path.join(__dirname, "numpy_solver.py");

  return new Promise((resolve, reject) => {
    // Spawn the Python process
    const pythonProcess = spawn("python", [pythonScriptPath, solveData]);

    let resultData = "";
    let errorData = "";

    // Collect output from the Python script
    pythonProcess.stdout.on("data", (data) => {
      resultData += data.toString();
    });

    // Collect error output
    pythonProcess.stderr.on("data", (data) => {
      errorData += data.toString();
    });

    // Handle process completion
    pythonProcess.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(`Python process exited with code ${code}. Error: ${errorData}`));
        return;
      }

      try {
        const result = JSON.parse(resultData.trim());
        if (result.error) {
          reject(new Error(result.error));
        } else {
          resolve(result.solution);
        }
      } catch (err) {
        reject(new Error(`Failed to parse Python output: ${resultData}`));
      }
    });
  });
}

/**
 * Solves an Ordinary Differential Equation (ODE) using numerical methods
 * @param options ODEOptions configuration
 * @returns Promise with the solution result
 */
export async function solveODE(options: ODEOptions): Promise<ODEResult> {
  const defaultOptions = {
    numPoints: 100,
    method: "RK45",
    maxStep: 0.1,
    tolerance: 1e-6,
  };

  // Merge default options with provided options
  const config = {
    type: "ode",
    ...defaultOptions,
    ...options,
  };

  // Format the data to be passed to Python
  const solveData = JSON.stringify(config);

  // Get the path to the Python script
  const pythonScriptPath = path.join(__dirname, "numpy_solver.py");

  return new Promise((resolve, reject) => {
    // Spawn the Python process
    const pythonProcess = spawn("python", [pythonScriptPath, solveData]);

    let resultData = "";
    let errorData = "";

    // Collect output from the Python script
    pythonProcess.stdout.on("data", (data) => {
      resultData += data.toString();
    });

    // Collect error output
    pythonProcess.stderr.on("data", (data) => {
      errorData += data.toString();
    });

    // Handle process completion
    pythonProcess.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(`Python process exited with code ${code}. Error: ${errorData}`));
        return;
      }

      try {
        const result = JSON.parse(resultData.trim());
        if (result.error) {
          reject(new Error(result.error));
        } else {
          resolve(result);
        }
      } catch (err) {
        reject(new Error(`Failed to parse Python output: ${resultData}`));
      }
    });
  });
}
