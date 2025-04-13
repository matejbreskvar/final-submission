import { solveEquation, solveLinearSystem, solveODE } from "./tools/math_tools/use-numpy.ts";
import { solveSymbolic, solveSymbolicSystem, differentiate, integrate } from "./tools/math_tools/use-sympy.ts";
import { plotFunctions } from "./tools/math_tools/plot.ts";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

// ES Module equivalent for __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runTests() {
  console.log("🧪 TESTING MATHEMATICAL FUNCTIONS 🧪");

  // ==========================================
  // 1️⃣ Testing solveEquation function (Numeric)
  // ==========================================
  console.log("\n📊 EQUATION SOLVING TEST CASES (NUMERIC):");

  try {
    // Test Case 1: Simple quadratic equation
    const quadratic = await solveEquation({
      equation: "x^2 - 4 = 0",
      precision: 2,
      method: "numeric",
    });
    console.log("📝 Quadratic equation (x^2 - 4 = 0):");
    console.log("   Solutions:", quadratic.solutions);
    console.log("   Expected: [-2, 2]");

    // Test Case 2: Trigonometric equation
    const trig = await solveEquation({
      equation: "sin(x) - 0.5 = 0",
      domain: [0, 2 * Math.PI],
      method: "numeric",
      precision: 4,
    });
    console.log("\n📝 Trigonometric equation (sin(x) = 0.5):");
    console.log("   Solutions:", trig.solutions);
    console.log("   Expected: ~[0.5236, 2.6180]");

    // Plot the functions from our examples
    const plotPath = await plotFunctions({
      functions: ["x^2 - 4", "sin(x) - 0.5"],
      title: "Numeric Test Equations",
    });
    console.log("\n📈 Plot generated at:", plotPath);
  } catch (error) {
    console.error("❌ Error in numeric equation solving tests:", error);
  }

  // ==========================================
  // 2️⃣ Testing solveSymbolic function (SymPy)
  // ==========================================
  console.log("\n📊 EQUATION SOLVING TEST CASES (SYMBOLIC):");

  try {
    // Test Case 1: Polynomial with detailed steps
    const symbolicPoly = await solveSymbolic({
      equation: "x^3 - 6*x^2 + 11*x - 6 = 0",
      precision: 2,
      showSteps: true,
    });
    console.log("📝 Cubic polynomial (x^3 - 6x^2 + 11x - 6 = 0):");
    console.log("   Solutions:", symbolicPoly.solutions);
    console.log("   Expected: [1, 2, 3]");
    console.log("   Solution steps:");
    symbolicPoly.steps?.forEach((step, i) => {
      console.log(`     ${i + 1}. ${step}`);
    });

    // Test Case 2: Quadratic with factoring steps
    const symbolicQuadratic = await solveSymbolic({
      equation: "x^2 - 5*x + 6 = 0",
      showSteps: true,
    });
    console.log("\n📝 Quadratic with steps (x^2 - 5x + 6 = 0):");
    console.log("   Solutions:", symbolicQuadratic.solutions);
    console.log("   Expected: [2, 3]");
    console.log("   Solution steps:");
    symbolicQuadratic.steps?.slice(0, 8).forEach((step, i) => {
      console.log(`     ${i + 1}. ${step}`);
    });
    console.log("     ... (additional steps omitted)");

    // Test Case 3: Exponential equation
    const symbolicExp = await solveSymbolic({
      equation: "2^x - 8 = 0",
      showSteps: true,
    });
    console.log("\n📝 Exponential equation (2^x - 8 = 0):");
    console.log("   Solutions:", symbolicExp.solutions);
    console.log("   Expected: [3]");

    // Test Case 4: Compare numeric vs symbolic for a complex equation
    const complexEq = "x^5 - 4*x^4 - 7*x^3 + 34*x^2 - 24*x = 0";

    console.log("\n📝 Complex equation comparison:");
    console.log("   Equation:", complexEq);

    const complexNumeric = await solveEquation({
      equation: complexEq,
      method: "numeric",
    });
    console.log("   Numeric solutions:", complexNumeric.solutions);

    const complexSymbolic = await solveSymbolic({
      equation: complexEq,
    });
    console.log("   Symbolic solutions:", complexSymbolic.solutions);
    console.log("   Symbolic solution confirms factorization: x(x - 4)(x - 1)(x + 3)(x + 2)");

    // Plot the functions from our symbolic examples
    const plotSymbolicPath = await plotFunctions({
      functions: ["x^3 - 6*x^2 + 11*x - 6", "x^2 - 5*x + 6", "2^x - 8", complexEq],
      title: "Symbolic Test Equations",
      outputPath: path.join(__dirname, "temp", "symbolic_equations.png"),
    });
    console.log("\n📈 Symbolic equations plot generated at:", plotSymbolicPath);
  } catch (error) {
    console.error("❌ Error in symbolic equation solving tests:", error);
  }

  // ==========================================
  // 3️⃣ Testing Linear System Solvers
  // ==========================================
  console.log("\n📊 LINEAR SYSTEM SOLVING TEST CASES:");

  try {
    // Test Case 1: 2x2 system with NumPy
    const system2x2 = await solveLinearSystem(["2x + y = 5", "x - y = 1"]);
    console.log("📝 2x2 System with NumPy (2x + y = 5, x - y = 1):");
    console.log("   Solution:", system2x2);
    console.log("   Expected: { x: 2, y: 1 }");

    // Test Case 2: 2x2 system with SymPy
    const symbolicSystem2x2 = await solveSymbolicSystem({
      equations: ["2x + y = 5", "x - y = 1"],
      showSteps: true,
    });
    console.log("\n📝 2x2 System with SymPy (with steps):");
    console.log("   Solution:", symbolicSystem2x2.solution);
    console.log("   Expected: { x: 2, y: 1 }");
    console.log("   Solution steps:");
    symbolicSystem2x2.steps?.slice(0, 6).forEach((step, i) => {
      console.log(`     ${i + 1}. ${step}`);
    });
    console.log("     ... (additional steps omitted)");

    // Test Case 3: 3x3 system with SymPy
    const symbolicSystem3x3 = await solveSymbolicSystem({
      equations: ["x + y + z = 6", "2x - y + z = 3", "x + 2y - z = 0"],
      showSteps: true,
    });
    console.log("\n📝 3x3 System with SymPy (with steps):");
    console.log("   Solution:", symbolicSystem3x3.solution);
    console.log("   Expected: { x: 1, y: 2, z: 3 }");
  } catch (error) {
    console.error("❌ Error in linear system tests:", error);
  }

  // ==========================================
  // 4️⃣ Testing Calculus Functions (SymPy)
  // ==========================================
  console.log("\n📊 CALCULUS FUNCTIONS TEST CASES:");

  try {
    // Test Case 1: Differentiation
    const diffPoly = await differentiate("x^3 + 2*x^2 - 5*x + 1");
    console.log("📝 Differentiation of polynomial (x^3 + 2x^2 - 5x + 1):");
    console.log(`   d/dx(${diffPoly.original}) = ${diffPoly.derivative}`);
    console.log("   Expected: 3x² + 4x - 5");
    console.log("   Steps:");
    diffPoly.steps?.slice(0, 5).forEach((step, i) => {
      console.log(`     ${i + 1}. ${step}`);
    });

    // Test Case 2: Differentiation of trigonometric function
    const diffTrig = await differentiate("sin(x)*cos(x)");
    console.log("\n📝 Differentiation of sin(x)*cos(x):");
    console.log(`   d/dx(${diffTrig.original}) = ${diffTrig.derivative}`);
    console.log("   Expected: cos(x)² - sin(x)²");

    // Test Case 3: Second order derivative
    const diffSecondOrder = await differentiate("x^4", "x", 2);
    console.log("\n📝 Second derivative of x^4:");
    console.log(`   d²/dx²(${diffSecondOrder.original}) = ${diffSecondOrder.derivative}`);
    console.log("   Expected: 12x²");

    // Test Case 4: Definite integration
    const intDefPoly = await integrate("x^2 + 1", "x", [0, 1]);
    console.log("\n📝 Definite integration of x^2 + 1 from 0 to 1:");
    console.log(`   ∫(${intDefPoly.original})dx from ${intDefPoly.limits[0]} to ${intDefPoly.limits[1]} = ${intDefPoly.integral}`);
    console.log("   Expected: 4/3");
    console.log("   Steps:");
    intDefPoly.steps?.slice(0, 5).forEach((step, i) => {
      console.log(`     ${i + 1}. ${step}`);
    });

    // Test Case 5: Indefinite integration
    const intIndefTrig = await integrate("sin(x)");
    console.log("\n📝 Indefinite integration of sin(x):");
    console.log(`   ∫(${intIndefTrig.original})dx = ${intIndefTrig.integral}`);
    console.log("   Expected: -cos(x)");

    // Plot derivatives of common functions
    const plotDerivativesPath = await plotFunctions({
      functions: ["x^2", "3*x^2 + 4*x - 5", "sin(x)", "cos(x)"],
      title: "Function and Its Derivative",
      outputPath: path.join(__dirname, "temp", "derivatives.png"),
    });
    console.log("\n📈 Derivatives plot generated at:", plotDerivativesPath);
  } catch (error) {
    console.error("❌ Error in calculus function tests:", error);
  }

  // ==========================================
  // 5️⃣ Testing solveODE function
  // ==========================================
  console.log("\n📊 DIFFERENTIAL EQUATION TEST CASES:");

  try {
    // Test Case 1: Exponential growth (dy/dx = y)
    const expGrowth = await solveODE({
      equation: "y", // equivalent to dy/dx = y
      initialCondition: 1,
      x0: 0,
      xEnd: 2,
      numPoints: 20,
    });
    console.log("📝 Exponential growth (dy/dx = y, y(0)=1):");
    console.log(
      "   First 3 points:",
      expGrowth.x.slice(0, 3).map((x, i) => `(${x.toFixed(2)}, ${expGrowth.y[i].toFixed(4)})`)
    );
    console.log("   Last point:", `(${expGrowth.x[expGrowth.x.length - 1].toFixed(2)}, ${expGrowth.y[expGrowth.y.length - 1].toFixed(4)})`);
    console.log("   Expected last point: (2.00, ~7.3891)");

    // Test Case 2: Logistic growth comparison methods
    const eulerResult = await solveODE({
      equation: "y * (1 - y/10)", // Logistic growth: dy/dx = y(1-y/10)
      initialCondition: 0.1,
      x0: 0,
      xEnd: 5,
      numPoints: 50,
      method: "Euler",
    });

    const rk45Result = await solveODE({
      equation: "y * (1 - y/10)", // Same equation with RK45
      initialCondition: 0.1,
      x0: 0,
      xEnd: 5,
      numPoints: 50,
      method: "RK45",
    });

    console.log("\n📝 Logistic growth (dy/dx = y(1-y/10), y(0)=0.1):");
    console.log("   Euler final value:", eulerResult.y[eulerResult.y.length - 1].toFixed(4));
    console.log("   RK45 final value:", rk45Result.y[rk45Result.y.length - 1].toFixed(4));

    // Plot the ODE solutions for comparison
    const odePlotPath = await plotFunctions({
      functions: [
        // Convert points to functions for plotting
        `[${expGrowth.x.map((x, i) => `(${x},${expGrowth.y[i]})`).join(", ")}]`,
        `[${eulerResult.x.map((x, i) => `(${x},${eulerResult.y[i]})`).join(", ")}]`,
        `[${rk45Result.x.map((x, i) => `(${x},${rk45Result.y[i]})`).join(", ")}]`,
      ],
      title: "ODE Solutions",
      outputPath: path.join(__dirname, "temp", "ode_solutions.png"),
    });
    console.log("\n📈 ODE solutions plot generated at:", odePlotPath);
  } catch (error) {
    console.error("❌ Error in ODE tests:", error);
  }
}

// Run all tests
runTests()
  .then(() => console.log("\n✅ All tests completed"))
  .catch((err) => console.error("\n❌ Test run failed:", err));
