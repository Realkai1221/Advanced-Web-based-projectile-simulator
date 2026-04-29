class StepByStepPanel {
  constructor(el) {
    this.container = el;
  }

  // Renders the RK4 breakdown for a specific trajectory step
  showStep(point, nextPoint, gravity, dragModelName, dragCoeff) {
    console.log('stepByStep.showStep called', { point, nextPoint, gravity, dragModelName, dragCoeff });
    if (!point || !nextPoint) {
      this.container.innerHTML = '<p class="step-hint">Select a trajectory point while paused to see RK4 calculations.</p>';
      return;
    }

    this.container.classList.remove('hidden');

    var vx = point.vx;
    var vy = point.vy;
    var speed = Math.sqrt(vx * vx + vy * vy);
    var dt = 0.005; // fixedDt from SimulationEnvironment

    let html = '<div class="step-content">';
    html += '<h3>RK4 Integration Step</h3>';

    html += '<div class="step-section">';
    html += '<div class="step-label">Current State:</div>';
    html += this._renderTeX(`x = ${point.x.toFixed(4)}, \\quad y = ${point.y.toFixed(4)}`);
    html += this._renderTeX(`v_x = ${vx.toFixed(4)}, \\quad v_y = ${vy.toFixed(4)}`);
    html += this._renderTeX(`|v| = \\sqrt{v_x^2 + v_y^2} = ${speed.toFixed(4)} \\text{ m/s}`);
    html += '</div>';

    html += '<div class="step-section">';
    html += '<div class="step-label">Acceleration Function:</div>';
    html += this._renderTeX(`a_x = \\frac{F_{drag,x}}{m}, \\quad a_y = -g + \\frac{F_{drag,y}}{m}`);

    if (dragModelName === 'none') {
      html += this._renderTeX(`F_{drag} = 0 \\quad \\text{(vacuum)}`);
      html += this._renderTeX(`a_x = 0, \\quad a_y = -${gravity} \\text{ m/s}^2`);
    } else if (dragModelName === 'linear') {
      html += this._renderTeX(`F_{drag,x} = -c \\cdot v_x = -${dragCoeff} \\times ${vx.toFixed(4)}`);
      html += this._renderTeX(`F_{drag,y} = -c \\cdot v_y = -${dragCoeff} \\times ${vy.toFixed(4)}`);
    } else {
      html += this._renderTeX(`F_{drag} = \\frac{1}{2} \\rho C_d A |v|^2 \\text{ (opposing velocity)}`);
    }
    html += '</div>';

    var ax = nextPoint.ax || 0;
    var ay = nextPoint.ay || 0;

    html += '<div class="step-section">';
    html += '<div class="step-label">RK4 Stages:</div>';
    html += this._renderTeX(`k_1 = f(t, \\mathbf{y}) = (a_x, a_y) \\text{ at current state}`);
    html += this._renderTeX(`k_2 = f\\left(t + \\frac{\\Delta t}{2}, \\; \\mathbf{y} + \\frac{\\Delta t}{2} k_1\\right)`);
    html += this._renderTeX(`k_3 = f\\left(t + \\frac{\\Delta t}{2}, \\; \\mathbf{y} + \\frac{\\Delta t}{2} k_2\\right)`);
    html += this._renderTeX(`k_4 = f(t + \\Delta t, \\; \\mathbf{y} + \\Delta t \\cdot k_3)`);
    html += '</div>';

    // Weighted average
    html += '<div class="step-section">';
    html += '<div class="step-label">Weighted Average:</div>';
    html += this._renderTeX(`\\bar{a} = \\frac{k_1 + 2k_2 + 2k_3 + k_4}{6}`);
    html += this._renderTeX(`\\bar{a}_x \\approx ${ax.toFixed(4)} \\text{ m/s}^2, \\quad \\bar{a}_y \\approx ${ay.toFixed(4)} \\text{ m/s}^2`);
    html += '</div>';

    // Updated state
    html += '<div class="step-section">';
    html += '<div class="step-label">Updated State (dt = ' + dt + 's):</div>';
    html += this._renderTeX(`v_x' = v_x + \\bar{a}_x \\cdot \\Delta t = ${nextPoint.vx.toFixed(4)}`);
    html += this._renderTeX(`v_y' = v_y + \\bar{a}_y \\cdot \\Delta t = ${nextPoint.vy.toFixed(4)}`);
    html += this._renderTeX(`x' = x + v_x' \\cdot \\Delta t = ${nextPoint.x.toFixed(4)}`);
    html += this._renderTeX(`y' = y + v_y' \\cdot \\Delta t = ${nextPoint.y.toFixed(4)}`);
    html += '</div>';

    html += '</div>';
    this.container.innerHTML = html;
  }

  _renderTeX(tex) {
    try {
      return `<div class="katex-line">${katex.renderToString(tex, { displayMode: true, throwOnError: false })}</div>`;
    } catch (e) {
      return `<div class="katex-line"><code>${tex}</code></div>`;
    }
  }

  hide() {
    this.container.innerHTML = '<p class="step-hint">Pause the simulation and click on the trajectory to inspect a step.</p>';
  }
}
