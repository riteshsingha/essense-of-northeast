// ==========================================================================
// ESSENCE OF NORTHEAST — PROCEDURAL AMBIENT SOUND & WEATHER ENGINE
// Web Audio API Soundscapes • Zero External Assets • 60fps Canvas Weather
// ==========================================================================

class AmbientEngine {
    constructor() {
        this.ctx = null;
        this.sounds = {
            rain: { gain: null, node: null, vol: 0 },
            fire: { gain: null, node: null, vol: 0 },
            stream: { gain: null, node: null, vol: 0 },
            crickets: { gain: null, node: null, vol: 0 },
            bowl: { gain: null, node: null, vol: 0 }
        };
        this.masterGain = null;
        this.isMuted = false;
        this.canvas = null;
        this.canvasCtx = null;
        this.particles = [];
        this.weatherEffect = 'fireflies'; // 'none' | 'rain' | 'fireflies' | 'mist'
        this.animFrameId = null;
    }

    initAudio() {
        if (this.ctx) return;
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        this.ctx = new AudioContext();
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.setValueAtTime(0.8, this.ctx.currentTime);
        this.masterGain.connect(this.ctx.destination);

        this.setupRain();
        this.setupFire();
        this.setupStream();
        this.setupCrickets();
    }

    ensureContext() {
        this.initAudio();
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    // 1. Cherrapunji / Mawsynram Rain: Pink noise through bandpass
    setupRain() {
        const bufferSize = this.ctx.sampleRate * 2;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;

        for (let i = 0; i < bufferSize; i++) {
            const white = Math.random() * 2 - 1;
            b0 = 0.99886 * b0 + white * 0.0555179;
            b1 = 0.99332 * b1 + white * 0.0750759;
            b2 = 0.96900 * b2 + white * 0.1538520;
            b3 = 0.86650 * b3 + white * 0.3104856;
            b4 = 0.55000 * b4 + white * 0.5329522;
            b5 = -0.7616 * b5 - white * 0.0168980;
            data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.08;
            b6 = white * 0.115926;
        }

        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;
        noise.loop = true;

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(1400, this.ctx.currentTime);

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0, this.ctx.currentTime);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterGain);
        noise.start();

        this.sounds.rain.gain = gain;
    }

    // 2. Campfire Crackle: Brown noise with random burst clicks
    setupFire() {
        const bufferSize = this.ctx.sampleRate * 2;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        let lastOut = 0.0;

        for (let i = 0; i < bufferSize; i++) {
            const white = Math.random() * 2 - 1;
            data[i] = (lastOut + (0.02 * white)) / 1.02;
            lastOut = data[i];
            data[i] *= 2.5;
            // Occasional snap crackle
            if (Math.random() < 0.001) {
                data[i] += (Math.random() * 2 - 1) * 0.6;
            }
        }

        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;
        noise.loop = true;

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(650, this.ctx.currentTime);
        filter.Q.setValueAtTime(1.8, this.ctx.currentTime);

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0, this.ctx.currentTime);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterGain);
        noise.start();

        this.sounds.fire.gain = gain;
    }

    // 3. Mountain River / Stream: Undulating lowpass noise
    setupStream() {
        const bufferSize = this.ctx.sampleRate * 2;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);

        for (let i = 0; i < bufferSize; i++) {
            data[i] = (Math.random() * 2 - 1) * 0.15;
        }

        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;
        noise.loop = true;

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(800, this.ctx.currentTime);
        filter.Q.setValueAtTime(0.7, this.ctx.currentTime);

        // LFO for undulating water flow
        const lfo = this.ctx.createOscillator();
        lfo.frequency.setValueAtTime(0.25, this.ctx.currentTime);
        const lfoGain = this.ctx.createGain();
        lfoGain.gain.setValueAtTime(250, this.ctx.currentTime);
        lfo.connect(lfoGain);
        lfoGain.connect(filter.frequency);
        lfo.start();

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0, this.ctx.currentTime);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterGain);
        noise.start();

        this.sounds.stream.gain = gain;
    }

    // 4. Night Crickets: Modulated high-pitch pulse
    setupCrickets() {
        const osc = this.ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(4600, this.ctx.currentTime);

        const mod = this.ctx.createOscillator();
        mod.type = 'sine';
        mod.frequency.setValueAtTime(28, this.ctx.currentTime);

        const modGain = this.ctx.createGain();
        modGain.gain.setValueAtTime(120, this.ctx.currentTime);
        mod.connect(modGain);
        modGain.connect(osc.frequency);

        const tremolo = this.ctx.createOscillator();
        tremolo.type = 'square';
        tremolo.frequency.setValueAtTime(3.2, this.ctx.currentTime);

        const tremoloGain = this.ctx.createGain();
        tremoloGain.gain.setValueAtTime(0.5, this.ctx.currentTime);
        tremolo.connect(tremoloGain);

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0, this.ctx.currentTime);

        osc.connect(gain);
        gain.connect(this.masterGain);

        osc.start();
        mod.start();
        tremolo.start();

        this.sounds.crickets.gain = gain;
    }

    // 5. Monastery Singing Bowl: Triggerable resonant chime
    playMonasteryBowl() {
        this.ensureContext();
        if (!this.ctx) return;

        const fundamental = 260; // C4 range
        const harmonics = [1, 2.76, 5.4, 8.9];
        const gains = [0.4, 0.22, 0.1, 0.04];

        harmonics.forEach((h, idx) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'sine';
            osc.frequency.setValueAtTime(fundamental * h, this.ctx.currentTime);

            gain.gain.setValueAtTime(0, this.ctx.currentTime);
            gain.gain.linearRampToValueAtTime(gains[idx], this.ctx.currentTime + 0.15);
            gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + 6.5);

            osc.connect(gain);
            gain.connect(this.masterGain);

            osc.start();
            osc.stop(this.ctx.currentTime + 7);
        });
    }

    setSoundVolume(type, val) {
        this.ensureContext();
        if (!this.sounds[type] || !this.sounds[type].gain) return;
        this.sounds[type].vol = val;
        const target = (val / 100) * 0.45;
        this.sounds[type].gain.gain.setTargetAtTime(target, this.ctx.currentTime, 0.1);
    }

    // --- Weather Particle Canvas Engine ---
    initCanvas(canvasEl) {
        this.canvas = canvasEl;
        this.canvasCtx = this.canvas.getContext('2d');
        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());
        this.initParticles();
        this.startLoop();
    }

    resizeCanvas() {
        if (!this.canvas) return;
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }

    setWeatherEffect(effect) {
        this.weatherEffect = effect;
        this.initParticles();
    }

    initParticles() {
        this.particles = [];
        if (!this.canvas) return;
        const w = this.canvas.width;
        const h = this.canvas.height;

        if (this.weatherEffect === 'rain') {
            const count = Math.min(Math.floor(w * 0.18), 160);
            for (let i = 0; i < count; i++) {
                this.particles.push({
                    x: Math.random() * w,
                    y: Math.random() * h,
                    len: 12 + Math.random() * 16,
                    speed: 14 + Math.random() * 10,
                    opacity: 0.2 + Math.random() * 0.4
                });
            }
        } else if (this.weatherEffect === 'fireflies') {
            const count = Math.min(Math.floor(w * 0.04), 45);
            for (let i = 0; i < count; i++) {
                this.particles.push({
                    x: Math.random() * w,
                    y: Math.random() * h,
                    vx: (Math.random() - 0.5) * 0.8,
                    vy: (Math.random() - 0.5) * 0.6,
                    radius: 1.5 + Math.random() * 2.5,
                    alpha: Math.random(),
                    alphaSpeed: 0.015 + Math.random() * 0.02
                });
            }
        } else if (this.weatherEffect === 'mist') {
            const count = 12;
            for (let i = 0; i < count; i++) {
                this.particles.push({
                    x: Math.random() * w,
                    y: h - Math.random() * (h * 0.5),
                    vx: 0.3 + Math.random() * 0.4,
                    radius: 120 + Math.random() * 180,
                    alpha: 0.04 + Math.random() * 0.07
                });
            }
        }
    }

    startLoop() {
        const render = () => {
            this.draw();
            this.animFrameId = requestAnimationFrame(render);
        };
        render();
    }

    draw() {
        if (!this.canvasCtx || this.weatherEffect === 'none') {
            if (this.canvasCtx) this.canvasCtx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            return;
        }

        const ctx = this.canvasCtx;
        const w = this.canvas.width;
        const h = this.canvas.height;

        ctx.clearRect(0, 0, w, h);

        if (this.weatherEffect === 'rain') {
            ctx.strokeStyle = 'rgba(210, 235, 255, 0.45)';
            ctx.lineWidth = 1.2;
            ctx.lineCap = 'round';
            ctx.beginPath();

            for (let p of this.particles) {
                ctx.moveTo(p.x, p.y);
                ctx.lineTo(p.x - 2, p.y + p.len);
                p.y += p.speed;
                p.x -= 1.2;

                if (p.y > h) {
                    p.y = -20;
                    p.x = Math.random() * w;
                }
            }
            ctx.stroke();
        } else if (this.weatherEffect === 'fireflies') {
            for (let p of this.particles) {
                p.x += p.vx;
                p.y += p.vy;
                p.alpha += p.alphaSpeed;

                if (p.alpha > 1 || p.alpha < 0.15) {
                    p.alphaSpeed = -p.alphaSpeed;
                }

                if (p.x < 0) p.x = w;
                if (p.x > w) p.x = 0;
                if (p.y < 0) p.y = h;
                if (p.y > h) p.y = 0;

                const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.radius * 3);
                grad.addColorStop(0, `rgba(167, 243, 208, ${p.alpha * 0.9})`);
                grad.addColorStop(0.4, `rgba(52, 211, 153, ${p.alpha * 0.4})`);
                grad.addColorStop(1, 'rgba(16, 185, 129, 0)');

                ctx.fillStyle = grad;
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.radius * 3, 0, Math.PI * 2);
                ctx.fill();
            }
        } else if (this.weatherEffect === 'mist') {
            for (let p of this.particles) {
                p.x += p.vx;
                if (p.x - p.radius > w) p.x = -p.radius;

                const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.radius);
                grad.addColorStop(0, `rgba(240, 245, 255, ${p.alpha})`);
                grad.addColorStop(1, 'rgba(240, 245, 255, 0)');

                ctx.fillStyle = grad;
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
                ctx.fill();
            }
        }
    }
}

window.ambientEngine = new AmbientEngine();
