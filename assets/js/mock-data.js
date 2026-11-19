(() => {
  'use strict';
  const TG = window.ThermoGuard;
  const outputs = {
    NORMAL: { servo: 0, buzzer: false, led: 'green' },
    WARNING: { servo: 45, buzzer: false, led: 'yellow' },
    CRITICAL: { servo: 90, buzzer: true, led: 'red' }
  };
  TG.classify = d => {
    const critSmoke = Math.max((d.smokeThreshold || 5000) * 4, 25000);
    const critTemp = (d.setpoint || 35) + 7;
    if (d.smoke >= critSmoke || d.temperature >= critTemp) return 'CRITICAL';
    if (d.smoke >= d.smokeThreshold || d.temperature > d.setpoint) return 'WARNING';
    return 'NORMAL';
  };
  TG.outputs = outputs;
  TG.MockData = class {
    constructor(settings) { this.settings = settings; this.mode = 'NORMAL'; this.buffer = []; this.dropped = 0; this.sequence = 0; }
    setScenario(mode) { if (outputs[mode]) this.mode = mode; }
    sample(ts = Date.now()) {
      const s = this.settings;
      const wave = Math.sin(ts / 19000);
      const setpoint = s.setpointMode === 'manual' ? s.manualSetpoint : 30 + Math.round(wave * 2) / 10;
      const offset = { NORMAL: -3.8, WARNING: 2.8, CRITICAL: 8.2 }[this.mode];
      const smokeRatio = this.mode === 'CRITICAL' ? 6.0 : this.mode === 'WARNING' ? 1.4 : .004;
      const smoke = Math.max(0, Math.round(s.smokeThreshold * (smokeRatio + (this.mode === 'NORMAL' ? 0 : .05 * wave))));
      return {
        id: `demo-${++this.sequence}`, ts, source: 'demo', replay: false,
        temperature: +(setpoint + offset + wave * .35).toFixed(1), humidity: +(47 + wave * 2).toFixed(1),
        smoke, lpg: Math.round(smoke * 0.18), co: Math.round(smoke * 8.5), setpoint,
        smokeThreshold: s.smokeThreshold, setpointMode: s.setpointMode,
        actuators: { ...outputs[this.mode] }, configId: s.configId
      };
    }
    collect(sample) {
      if (this.buffer.length >= 120) { this.buffer.shift(); this.dropped++; }
      this.buffer.push(sample);
    }
    sync() { const batch = this.buffer.splice(0); this.dropped = 0; return batch; }
  };
})();