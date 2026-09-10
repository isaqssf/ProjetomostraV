      const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
      const precisePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
      const heroFrame = document.querySelector('.hero-frame');
      const securityCanvas = document.querySelector('#security-field');
      const riskConsole = document.querySelector('.risk-console');

      class SecurityField {
        constructor(canvas, host) {
          this.canvas = canvas;
          this.host = host;
          this.context = canvas.getContext('2d', { alpha: false, desynchronized: true });
          this.width = 0;
          this.height = 0;
          this.pixelRatio = 1;
          this.inView = true;
          this.frameId = null;
          this.lastFrame = 0;
          this.frameInterval = 1000 / 60;
          this.pointer = { x: 0, y: 0, targetX: 0, targetY: 0, strength: 0, targetStrength: 0 };
          this.particles = [];

          this.resize = this.resize.bind(this);
          this.animate = this.animate.bind(this);
          this.sync = this.sync.bind(this);

          this.bindEvents();
          this.resize();
          this.sync();
        }

        bindEvents() {
          this.resizeObserver = new ResizeObserver(this.resize);
          this.resizeObserver.observe(this.host);

          if ('IntersectionObserver' in window) {
            this.visibilityObserver = new IntersectionObserver(([entry]) => {
              this.inView = entry.isIntersecting;
              this.sync();
            }, { threshold: 0.05 });
            this.visibilityObserver.observe(this.host);
          }

          this.host.addEventListener('pointermove', (event) => {
            if (!precisePointer.matches || reducedMotion.matches) return;
            const bounds = this.host.getBoundingClientRect();
            this.pointer.targetX = event.clientX - bounds.left;
            this.pointer.targetY = event.clientY - bounds.top;
            this.pointer.targetStrength = 1;
          });

          this.host.addEventListener('pointerleave', () => {
            this.pointer.targetX = this.width * 0.5;
            this.pointer.targetY = this.height * 0.43;
            this.pointer.targetStrength = 0;
          });

          document.addEventListener('visibilitychange', this.sync);
          reducedMotion.addEventListener?.('change', this.sync);
        }

        resize() {
          const bounds = this.host.getBoundingClientRect();
          this.width = Math.max(1, Math.round(bounds.width));
          this.height = Math.max(1, Math.round(bounds.height));
          this.pixelRatio = Math.min(window.devicePixelRatio || 1, this.width < 640 ? 1.35 : 1.75);
          this.canvas.width = Math.round(this.width * this.pixelRatio);
          this.canvas.height = Math.round(this.height * this.pixelRatio);
          this.canvas.style.width = `${this.width}px`;
          this.canvas.style.height = `${this.height}px`;
          this.frameInterval = this.width < 640 ? 1000 / 45 : 1000 / 60;
          this.pointer.x ||= this.width * 0.5;
          this.pointer.y ||= this.height * 0.43;
          this.pointer.targetX ||= this.width * 0.5;
          this.pointer.targetY ||= this.height * 0.43;
          this.createParticles();
          this.draw(reducedMotion.matches ? 0 : performance.now() * 0.001);
        }

        createParticles() {
          const count = this.width < 640 ? 38 : 82;
          const fract = (value) => value - Math.floor(value);
          const random = (index, salt) => fract(Math.sin(index * 91.173 + salt * 47.77) * 43758.5453);
          this.particles = Array.from({ length: count }, (_, index) => ({
            u: random(index, 1),
            v: random(index, 2),
            radius: 0.65 + random(index, 3) * 1.45,
            phase: random(index, 4) * Math.PI * 2,
            speed: 0.004 + random(index, 5) * 0.012,
          }));
        }

        sync() {
          const shouldAnimate = this.inView && !document.hidden && !reducedMotion.matches;
          if (shouldAnimate && this.frameId === null) {
            this.lastFrame = performance.now();
            this.frameId = requestAnimationFrame(this.animate);
          } else if (!shouldAnimate && this.frameId !== null) {
            cancelAnimationFrame(this.frameId);
            this.frameId = null;
            this.draw(0);
          } else if (!shouldAnimate) {
            this.draw(0);
          }
        }

        animate(timestamp) {
          if (timestamp - this.lastFrame >= this.frameInterval) {
            this.lastFrame = timestamp;
            this.pointer.x += (this.pointer.targetX - this.pointer.x) * 0.075;
            this.pointer.y += (this.pointer.targetY - this.pointer.y) * 0.075;
            this.pointer.strength += (this.pointer.targetStrength - this.pointer.strength) * 0.06;
            this.draw(timestamp * 0.001);
          }
          this.frameId = requestAnimationFrame(this.animate);
        }

        draw(time) {
          const ctx = this.context;
          const w = this.width;
          const h = this.height;
          if (!ctx || !w || !h) return;

          ctx.setTransform(this.pixelRatio, 0, 0, this.pixelRatio, 0, 0);
          ctx.globalCompositeOperation = 'source-over';
          ctx.globalAlpha = 1;

          const ground = ctx.createLinearGradient(0, 0, w, h);
          ground.addColorStop(0, '#05070A');
          ground.addColorStop(0.46, '#0C1119');
          ground.addColorStop(0.74, '#161C26');
          ground.addColorStop(1, '#080A0D');
          ctx.fillStyle = ground;
          ctx.fillRect(0, 0, w, h);

          this.drawAtmosphere(ctx, time);
          this.drawDotFields(ctx, time);
          this.drawMesh(ctx, time);
          this.drawParticles(ctx, time);
          this.drawPointerSignal(ctx, time);
        }

        drawAtmosphere(ctx, time) {
          const w = this.width;
          const h = this.height;
          ctx.save();
          ctx.globalCompositeOperation = 'screen';

          const glow = ctx.createRadialGradient(
            this.pointer.x,
            this.pointer.y,
            0,
            this.pointer.x,
            this.pointer.y,
            Math.max(w, h) * 0.42,
          );
          glow.addColorStop(0, `rgba(91, 155, 213, ${0.04 + this.pointer.strength * 0.12})`);
          glow.addColorStop(0.38, `rgba(58, 105, 216, ${0.035 + this.pointer.strength * 0.055})`);
          glow.addColorStop(1, 'rgba(10, 12, 15, 0)');
          ctx.fillStyle = glow;
          ctx.fillRect(0, 0, w, h);

          const ribbons = [
            { y: 0.23, amplitude: 30, width: 34, alpha: 0.04, speed: 0.21 },
            { y: 0.3, amplitude: 24, width: 16, alpha: 0.065, speed: 0.28 },
            { y: 0.37, amplitude: 18, width: 5, alpha: 0.12, speed: 0.34 },
          ];

          ribbons.forEach((ribbon, layer) => {
            const stroke = ctx.createLinearGradient(0, 0, w, 0);
            stroke.addColorStop(0, 'rgba(91, 155, 213, 0)');
            stroke.addColorStop(0.22, `rgba(91, 155, 213, ${ribbon.alpha})`);
            stroke.addColorStop(0.68, `rgba(46, 94, 140, ${ribbon.alpha * 1.25})`);
            stroke.addColorStop(1, 'rgba(46, 94, 140, 0)');
            ctx.beginPath();
            for (let index = 0; index <= 64; index += 1) {
              const u = index / 64;
              const x = u * w;
              const mouseDistance = Math.abs(x - this.pointer.x) / Math.max(w, 1);
              const mouseLift = Math.exp(-mouseDistance * mouseDistance * 18) * this.pointer.strength * -18;
              const y = h * ribbon.y
                + Math.sin(u * Math.PI * 2.15 + time * ribbon.speed + layer * 1.4) * ribbon.amplitude
                + Math.sin(u * Math.PI * 5.2 - time * 0.16) * ribbon.amplitude * 0.24
                + mouseLift;
              if (index === 0) ctx.moveTo(x, y);
              else ctx.lineTo(x, y);
            }
            ctx.strokeStyle = stroke;
            ctx.lineWidth = ribbon.width;
            ctx.lineCap = 'round';
            ctx.stroke();
          });
          ctx.restore();
        }

        drawDotFields(ctx, time) {
          const w = this.width;
          const h = this.height;
          const spacing = w < 640 ? 15 : 13;
          const pulse = 0.9 + Math.sin(time * 0.7) * 0.1;
          ctx.save();
          ctx.fillStyle = '#DCE6EF';

          for (let y = 0; y < h * 0.38; y += spacing) {
            for (let x = 0; x < w * 0.27; x += spacing) {
              const nx = x / (w * 0.27);
              const ny = y / (h * 0.38);
              const fade = Math.max(0, 1 - Math.hypot(nx * 0.8, ny * 0.95));
              if (fade <= 0.04) continue;
              ctx.globalAlpha = fade * 0.75;
              ctx.beginPath();
              ctx.arc(x + 2, y + 2, Math.max(0.35, fade * 2.1 * pulse), 0, Math.PI * 2);
              ctx.fill();
            }
          }

          for (let y = h * 0.6; y < h; y += spacing) {
            for (let x = w * 0.73; x < w; x += spacing) {
              const nx = (w - x) / (w * 0.27);
              const ny = (h - y) / (h * 0.4);
              const fade = Math.max(0, 1 - Math.hypot(nx * 0.8, ny * 0.95));
              if (fade <= 0.04) continue;
              ctx.globalAlpha = fade * 0.62;
              ctx.beginPath();
              ctx.arc(x - 2, y - 2, Math.max(0.35, fade * 1.8 / pulse), 0, Math.PI * 2);
              ctx.fill();
            }
          }
          ctx.restore();
        }

        meshPoint(column, row, columns, rows, time) {
          const w = this.width;
          const h = this.height;
          const u = column / (columns - 1);
          const v = row / (rows - 1);
          const x = u * w + Math.sin(time * 0.18 + v * 4.5) * (1 - v) * 12;
          const baseY = h * 0.43 + Math.pow(v, 1.45) * h * 0.61;
          const wave = Math.sin(u * Math.PI * 3.1 + time * 0.58 + v * 2.4) * (34 - v * 17)
            + Math.sin(u * Math.PI * 7.2 - time * 0.31 + v) * (9 - v * 4);
          const dx = (x - this.pointer.x) / Math.max(w * 0.28, 1);
          const dy = (baseY - this.pointer.y) / Math.max(h * 0.24, 1);
          const influence = Math.exp(-(dx * dx + dy * dy) * 2.6) * this.pointer.strength;
          return { x, y: baseY + wave - influence * 48, influence };
        }

        drawMesh(ctx, time) {
          const w = this.width;
          const columns = w < 640 ? 20 : 36;
          const rows = w < 640 ? 10 : 16;
          const points = Array.from({ length: rows }, (_, row) =>
            Array.from({ length: columns }, (_, column) => this.meshPoint(column, row, columns, rows, time)),
          );

          ctx.save();
          ctx.globalCompositeOperation = 'screen';

          for (let row = 0; row < rows; row += 1) {
            const gradient = ctx.createLinearGradient(0, 0, w, 0);
            const alpha = 0.2 + (1 - row / rows) * 0.3;
            gradient.addColorStop(0, `rgba(91, 155, 213, ${alpha * 0.75})`);
            gradient.addColorStop(0.52, `rgba(69, 183, 255, ${alpha})`);
            gradient.addColorStop(1, `rgba(20, 60, 96, ${alpha * 0.85})`);
            ctx.beginPath();
            points[row].forEach((point, column) => {
              if (column === 0) ctx.moveTo(point.x, point.y);
              else ctx.lineTo(point.x, point.y);
            });
            ctx.strokeStyle = gradient;
            ctx.lineWidth = row % 4 === 0 ? 1.2 : 0.65;
            ctx.stroke();
          }

          for (let column = 0; column < columns; column += 1) {
            ctx.beginPath();
            for (let row = 0; row < rows; row += 1) {
              const point = points[row][column];
              if (row === 0) ctx.moveTo(point.x, point.y);
              else ctx.lineTo(point.x, point.y);
            }
            ctx.strokeStyle = column % 5 === 0 ? 'rgba(91, 155, 213, 0.34)' : 'rgba(46, 94, 140, 0.2)';
            ctx.lineWidth = column % 5 === 0 ? 0.9 : 0.55;
            ctx.stroke();
          }

          for (let row = 0; row < rows - 1; row += 2) {
            for (let column = (row % 4) + 1; column < columns; column += 4) {
              const point = points[row][column];
              const radius = 1.1 + point.influence * 2.1 + Math.sin(time * 1.8 + column) * 0.28;
              ctx.fillStyle = point.influence > 0.22 ? '#ffffff' : '#5B9BD5';
              ctx.globalAlpha = 0.55 + point.influence * 0.42;
              ctx.beginPath();
              ctx.arc(point.x, point.y, Math.max(0.65, radius), 0, Math.PI * 2);
              ctx.fill();
            }
          }
          ctx.restore();
        }

        drawParticles(ctx, time) {
          const w = this.width;
          const h = this.height;
          ctx.save();
          ctx.globalCompositeOperation = 'screen';
          this.particles.forEach((particle) => {
            const u = (particle.u + time * particle.speed) % 1;
            const x = u * w;
            const y = h * (0.19 + particle.v * 0.62)
              + Math.sin(time * 0.55 + particle.phase + u * 5) * (8 + particle.v * 12);
            const twinkle = 0.32 + (Math.sin(time * 1.25 + particle.phase) + 1) * 0.22;
            ctx.globalAlpha = twinkle;
            ctx.fillStyle = particle.v > 0.66 ? '#8FB5D9' : '#5B9BD5';
            ctx.beginPath();
            ctx.arc(x, y, particle.radius, 0, Math.PI * 2);
            ctx.fill();
          });
          ctx.restore();
        }

        drawPointerSignal(ctx, time) {
          if (this.pointer.strength < 0.02) return;
          const { x, y, strength } = this.pointer;
          ctx.save();
          ctx.globalCompositeOperation = 'screen';
          ctx.globalAlpha = strength * 0.72;
          ctx.strokeStyle = '#5B9BD5';
          ctx.lineWidth = 0.8;
          ctx.beginPath();
          ctx.arc(x, y, 22 + Math.sin(time * 2.1) * 3, time * 0.7, time * 0.7 + Math.PI * 1.4);
          ctx.stroke();
          ctx.globalAlpha = strength * 0.28;
          ctx.beginPath();
          ctx.moveTo(x - 38, y);
          ctx.lineTo(x + 38, y);
          ctx.moveTo(x, y - 38);
          ctx.lineTo(x, y + 38);
          ctx.stroke();
          ctx.restore();
        }
      }

      const securityField = new SecurityField(securityCanvas, heroFrame);

      if (precisePointer.matches && !reducedMotion.matches) {
        riskConsole.addEventListener('pointermove', (event) => {
          const bounds = riskConsole.getBoundingClientRect();
          riskConsole.style.setProperty('--console-x', `${event.clientX - bounds.left}px`);
          riskConsole.style.setProperty('--console-y', `${event.clientY - bounds.top}px`);
        });
      }

      const menuButton = document.querySelector('#menu-button');
      const mobileMenu = document.querySelector('#mobile-menu');

      menuButton.addEventListener('click', () => {
        const isOpen = menuButton.getAttribute('aria-expanded') === 'true';
        menuButton.setAttribute('aria-expanded', String(!isOpen));
        menuButton.setAttribute('aria-label', isOpen ? 'Abrir menu' : 'Fechar menu');
        mobileMenu.setAttribute('aria-hidden', String(isOpen));
        mobileMenu.inert = isOpen;
        mobileMenu.classList.toggle('is-open', !isOpen);
      });

      mobileMenu.querySelectorAll('a').forEach((link) => {
        link.addEventListener('click', () => {
          mobileMenu.classList.remove('is-open');
          mobileMenu.setAttribute('aria-hidden', 'true');
          mobileMenu.inert = true;
          menuButton.setAttribute('aria-expanded', 'false');
          menuButton.setAttribute('aria-label', 'Abrir menu');
        });
      });

      const risks = {
        leak: {
          code: 'RISCO / 01',
          title: 'Dados fora do perímetro',
          copy: 'Informações sensíveis podem sair da empresa por caminhos que passam despercebidos no dia a dia: credenciais expostas em vazamentos de terceiros, links e planilhas compartilhados com permissão além do necessário, ou integrações e APIs conectadas a sistemas externos sem validação adequada. Uma vez fora do perímetro, dados de clientes, contratos e informações estratégicas ficam sujeitos a uso indevido, extorsão ou exposição pública — muitas vezes só percebidos quando o dano já está feito.',
          priority: 'Visibilidade e controle',
          response: 'Conter e rastrear',
        },
        ransomware: {
          code: 'RISCO / 02',
          title: 'Operação sob interrupção',
          copy: 'Um ataque de ransomware costuma começar de forma silenciosa — um e-mail malicioso, uma vulnerabilidade não corrigida ou um acesso comprometido — e evolui rapidamente para a criptografia de arquivos, sistemas e backups acessíveis. Em poucas horas, processos críticos param, equipes perdem acesso às ferramentas de trabalho e a empresa se vê diante de uma decisão sob pressão: pagar o resgate, tentar recuperar por conta própria ou arcar com dias de operação interrompida, com impacto direto em receita, reputação e contratos.',
          priority: 'Prevenção e prontidão',
          response: 'Isolar e recuperar',
        },
        failures: {
          code: 'RISCO / 03',
          title: 'Brechas que passam despercebidas',
          copy: 'Nem toda ameaça vem de um ataque direcionado. Configurações padrão nunca revisadas, sistemas e aplicativos sem atualização de segurança, senhas reaproveitadas e processos manuais sujeitos a erro humano formam, juntas, uma superfície de exposição que cresce silenciosamente. São falhas que raramente aparecem em um relatório até que alguém — dentro ou fora da empresa — as encontre primeiro, transformando uma vulnerabilidade conhecida em uma porta de entrada real.',
          priority: 'Identificar e corrigir',
          response: 'Reduzir exposição',
        },
        access: {
          code: 'RISCO / 04',
          title: 'Identidades fora de controle',
          copy: 'Contas de ex-funcionários ainda ativas, permissões concedidas para um projeto e nunca revogadas, senhas fracas ou reutilizadas em múltiplos sistemas: cada uma dessas situações amplia o número de caminhos possíveis até dados e sistemas críticos. Sem uma governança clara sobre quem acessa o quê e por quanto tempo, um único acesso comprometido pode se espalhar lateralmente pela rede, muitas vezes sem gerar nenhum alerta até que o estrago esteja feito.',
          priority: 'Governar identidades',
          response: 'Bloquear e revisar',
        },
        loss: {
          code: 'RISCO / 05',
          title: 'Informação sem retorno',
          copy: 'Nem toda perda de dados vem de um ataque: falhas de hardware, exclusões acidentais, erros de configuração e desastres físicos também podem apagar informações essenciais para a operação. O verdadeiro risco aparece quando os backups existem apenas no papel — sem testes de restauração, sem cópias isoladas do ambiente principal e sem um processo claro de recuperação. É nesse momento que a empresa descobre, tarde demais, que a informação que precisava simplesmente não pode ser trazida de volta.',
          priority: 'Continuidade dos dados',
          response: 'Restaurar e validar',
        },
      };

      const detail = document.querySelector('#risk-detail');
      document.querySelectorAll('.risk-button').forEach((button) => {
        button.addEventListener('click', () => {
          document.querySelectorAll('.risk-button').forEach((item) => item.setAttribute('aria-pressed', 'false'));
          button.setAttribute('aria-pressed', 'true');

          const selected = risks[button.dataset.risk];
          detail.classList.remove('risk-detail');
          void detail.offsetWidth;
          detail.classList.add('risk-detail');
          document.querySelector('#risk-code').textContent = selected.code;
          document.querySelector('#risk-title').textContent = selected.title;
          document.querySelector('#risk-copy').textContent = selected.copy;
          document.querySelector('#risk-priority').textContent = selected.priority;
          document.querySelector('#risk-response').textContent = selected.response;
        });
      });

      const form = document.querySelector('#assessment-form');
      const result = document.querySelector('#assessment-result');
      const chart = document.querySelector('#assessment-chart');
      const empty = document.querySelector('#assessment-empty');
      const assessmentStatus = document.querySelector('#assessment-status');
      const practiceInputs = [...form.querySelectorAll('select')];
      const responseGroups = [
        { value: 'yes', label: 'Sim · em prática', color: 'var(--cyan)' },
        { value: 'partial', label: 'Em parte · em andamento', color: '#8FB5D9' },
        { value: 'no', label: 'Não · a implementar', color: '#E7E9EC' },
        { value: 'unknown', label: 'Não sei · a verificar', color: 'var(--mist)' },
      ];

      const riskLevels = [
        {
          max: 0.3,
          label: 'Risco baixo',
          badge: 'Baixo',
          color: 'var(--cyan)',
          background: 'rgba(91, 155, 213, 0.16)',
          summary: 'As respostas indicam práticas de segurança consolidadas na maior parte das áreas avaliadas.',
        },
        {
          max: 0.6,
          label: 'Risco moderado',
          badge: 'Médio',
          color: '#8FB5D9',
          background: 'rgba(46, 94, 140, 0.28)',
          summary: 'Há avanços importantes, mas também lacunas que merecem atenção para reduzir a exposição da empresa.',
        },
        {
          max: Infinity,
          label: 'Risco alto',
          badge: 'Alto',
          color: '#0A0C0F',
          background: '#E7E9EC',
          summary: 'Diversas práticas essenciais ainda não estão em vigor, o que amplia a exposição a incidentes.',
        },
      ];
      const riskScoreByAnswer = { yes: 0, partial: 1, no: 2, unknown: 1.5 };
      const riskBadge = document.querySelector('#risk-level-badge');
      const riskTitle = document.querySelector('#risk-level-title');
      const riskSummary = document.querySelector('#risk-level-summary');

      function renderRiskLevel() {
        const totalScore = practiceInputs.reduce((sum, input) => sum + (riskScoreByAnswer[input.value] ?? 0), 0);
        const maxScore = practiceInputs.length * Math.max(...Object.values(riskScoreByAnswer));
        const ratio = maxScore ? totalScore / maxScore : 0;
        const level = riskLevels.find((item) => ratio <= item.max);

        riskBadge.textContent = level.badge;
        riskBadge.style.color = level.color;
        riskBadge.style.backgroundColor = level.background;
        riskBadge.style.border = `1px solid ${level.color}`;
        riskTitle.textContent = level.label;
        riskTitle.style.color = level.color;
        riskSummary.textContent = level.summary;

        return level;
      }

      form.addEventListener('submit', (event) => {
        event.preventDefault();
        if (!form.reportValidity()) return;
        const level = renderRiskLevel();
        chart.replaceChildren(...responseGroups.map((group) => {
          const count = practiceInputs.filter(input => input.value === group.value).length;
          const row = document.createElement('li');
          const heading = document.createElement('div');
          heading.className = 'flex items-center justify-between gap-3 text-sm text-mist';
          const label = document.createElement('span');
          label.textContent = group.label;
          const value = document.createElement('span');
          value.className = 'shrink-0 font-mono text-white';
          value.textContent = `${count} de ${practiceInputs.length}`;
          heading.append(label, value);
          const track = document.createElement('div');
          track.className = 'assessment-bar-track';
          track.setAttribute('aria-hidden', 'true');
          const bar = document.createElement('span');
          bar.className = 'assessment-bar-fill';
          bar.style.width = `${count / practiceInputs.length * 100}%`;
          bar.style.backgroundColor = group.color;
          track.append(bar);
          row.append(heading, track);
          return row;
        }));
        empty.classList.add('hidden');
        result.classList.remove('hidden');
        assessmentStatus.textContent = `Gráfico atualizado. Nível de risco estimado: ${level.label.toLowerCase()}.`;
        form.querySelector('button[type="submit"]').firstChild.textContent = 'Atualizar gráfico ';
        result.focus({ preventScroll: true });
        result.scrollIntoView({ behavior: reducedMotion.matches ? 'instant' : 'smooth', block: 'nearest' });
      });

      form.addEventListener('change', () => {
        const hadResult = !result.classList.contains('hidden');
        result.classList.add('hidden');
        empty.classList.remove('hidden');
        const answered = practiceInputs.filter(input => input.value).length;
        assessmentStatus.textContent = hadResult
          ? 'Respostas alteradas. Gere o gráfico novamente para atualizar.'
          : `${answered} de ${practiceInputs.length} práticas respondidas.`;
      });
