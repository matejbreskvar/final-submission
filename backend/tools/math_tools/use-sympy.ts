import { spawn } from "child_process";
import * as path from "path";
import { fileURLToPath } from "url";

// ES Module equivalent for __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface SymbolicOptions {
  equation: string; // Equation to solve (e.g., "x^2 - 4 = 0")
  variable?: string; // Variable to solve for (default: "x")
  domain?: [number, number]; // Domain to search for solutions
  precision?: number; // Number of decimal places in results
  showSteps?: boolean; // Whether to show solution steps
}

interface SymbolicResult {
  solutions: number[]; // Numerical solutions
  expression: string; // Original expression
  variable: string; // Variable solved for
  steps: string[]; // Detailed solution steps
}

interface SymbolicSystemOptions {
  equations: string[]; // Array of equations (e.g., ["2x + y = 5", "x - y = 1"])
  variables?: string[]; // Variables to solve for (e.g., ["x", "y"])
  showSteps?: boolean; // Whether to show solution steps
}

interface SymbolicSystemResult {
  solution: Record<string, number>; // Solutions mapped to variable names
  variables: string[]; // Variables that were solved for
  steps: string[]; // Detailed solution steps
}

/**
 * Solves equations symbolically with detailed steps using a Python subprocess with SymPy
 * @param options SymbolicOptions configuration
 * @returns Promise with the solution result including steps
 */
export async function solveSymbolic(options: SymbolicOptions): Promise<SymbolicResult> {
  const defaultOptions = {
    variable: "x",
    domain: [-1000, 1000],
    precision: 4,
    showSteps: true,
  };

  // Merge default options with provided options
  const config = { ...defaultOptions, ...options };

  // Format the data to be passed to Python
  const solveData = JSON.stringify(config);

  // Get the path to the Python script
  const pythonScriptPath = path.join(__dirname, "sympy_solver.py");

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
 * Solves a system of equations symbolically with detailed steps
 * @param options SymbolicSystemOptions configuration
 * @returns Promise with the solution result including steps
 */
export async function solveSymbolicSystem(options: SymbolicSystemOptions): Promise<SymbolicSystemResult> {
  const defaultOptions = {
    showSteps: true,
  };

  // Merge default options with provided options
  const config = {
    ...defaultOptions,
    ...options,
    type: "system",
  };

  // Format the data to be passed to Python
  const solveData = JSON.stringify(config);

  // Get the path to the Python script
  const pythonScriptPath = path.join(__dirname, "sympy_solver.py");

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
 * Performs symbolic differentiation with steps
 * @param expression Mathematical expression to differentiate
 * @param variable Variable to differentiate with respect to
 * @param order Order of differentiation (default: 1)
 * @returns Promise with the differentiated expression and steps
 */
export async function differentiate(expression: string, variable: string = "x", order: number = 1): Promise<any> {
  const config = {
    type: "differentiate",
    expression,
    variable,
    order,
    showSteps: true,
  };

  // Format the data to be passed to Python
  const solveData = JSON.stringify(config);

  // Get the path to the Python script
  const pythonScriptPath = path.join(__dirname, "sympy_solver.py");

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
 * Performs symbolic integration with steps
 * @param expression Mathematical expression to integrate
 * @param variable Variable to integrate with respect to
 * @param limits Optional integration limits [lower, upper] for definite integral
 * @returns Promise with the integrated expression and steps
 */
export async function integrate(expression: string, variable: string = "x", limits?: [number, number]): Promise<any> {
  const config = {
    type: "integrate",
    expression,
    variable,
    limits,
    showSteps: true,
  };

  // Format the data to be passed to Python
  const solveData = JSON.stringify(config);

  // Get the path to the Python script
  const pythonScriptPath = path.join(__dirname, "sympy_solver.py");

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
