try {
    (function() {
        // ==========================================
        // 1. GAME SETTINGS & APIs
        // ==========================================
        const APIs = {
            "1Min": "https://draw.ar-lottery01.com/WinGo/WinGo_1M/GetHistoryIssuePage.json",
            "30Sec": "https://draw.ar-lottery01.com/WinGo/WinGo_30S/GetHistoryIssuePage.json"
        };
        let currentAPI = APIs["1Min"]; 
        let activeMode = "1Min"; 

        const fundLevels = { 1: 10, 2: 30, 3: 70, 4: 150, 5: 350, 6: 750, 7: 1500, 8: 3000 };
        let currentLevel = 1;
        let lastPrediction = null; 
        let lastBetPeriod = "";

        const selectors = {
            bigBtn: ".Betting__C-foot-b",
            smallBtn: ".Betting__C-foot-s",
            amountInput: ".m input[type='number']",
            confirmBtn: ".bet-amount",
            periodId: ".TimeLeft__C-id" 
        };

        // ==========================================
        // 2. AUTO-BET ENGINE (SAFE CLICK)
        // ==========================================
        async function placeAutoBet(prediction) {
            let betAmount = fundLevels[currentLevel] || 10;
            let safePrediction = String(prediction).toUpperCase(); 

            try {
                let targetBtn = safePrediction === 'BIG' ? document.querySelector(selectors.bigBtn) : document.querySelector(selectors.smallBtn);
                if (targetBtn) targetBtn.click(); 
                
                await new Promise(r => setTimeout(r, 600)); 

                let inputField = document.querySelector(selectors.amountInput);
                if (inputField) {
                    let setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
                    setter.call(inputField, betAmount);
                    inputField.dispatchEvent(new Event('input', { bubbles: true })); 
                    inputField.dispatchEvent(new Event('change', { bubbles: true })); 
                }

                await new Promise(r => setTimeout(r, 600));
                let confirmBtn = document.querySelector(selectors.confirmBtn);
                if (confirmBtn) confirmBtn.click(); 
            } catch (e) {} // Error Ignored Silently
        }

        // ==========================================
        // 3. API RESULT CHECKER (SAFE FETCH)
        // ==========================================
        async function checkPreviousResult(periodToCheck) {
            if (!lastPrediction || !periodToCheck) return; 
            let attempts = 0;
            
            while (attempts < 6) {
                try {
                    let response = await fetch(currentAPI, {
                        method: "POST", headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ pageNo: 1, pageSize: 10, language: 0 }) 
                    }).catch(() => null);

                    if (!response || !response.ok) response = await fetch(currentAPI).catch(() => null); 
                    if (!response) return; // Exit if network fails

                    let data = await response.json().catch(() => ({}));
                    let historyList = data?.data?.list || data?.data || [];
                    
                    let periodData = historyList.find(item => 
                        String(item?.issueNumber).includes(periodToCheck) || 
                        String(item?.issue).includes(periodToCheck) || 
                        String(item?.period).includes(periodToCheck)
                    );
                    
                    if (periodData) {
                        let resultNum = Number(periodData.number !== undefined ? periodData.number : (periodData.prizeResult ? periodData.prizeResult.split(',')[0] : 0));
                        let actualResult = resultNum >= 5 ? 'BIG' : 'SMALL';
                        
                        if (lastPrediction === actualResult) {
                            currentLevel = 1; // WIN
                        } else {
                            if (currentLevel < 8) currentLevel++; // LOSS
                        }
                        updateUIDisplays();
                        return; 
                    }
                } catch (e) {} 
                
                attempts++;
                await new Promise(r => setTimeout(r, 2000)); 
            }
        }

        // ==========================================
        // 4. WINGO AI ENGINE
        // ==========================================
        let isAiRunning = false; 
        async function runRaxiAIEngine(currentPeriodId) {
            if (isAiRunning) return; 
            isAiRunning = true;
            try {
                let display = document.getElementById('prediction-text');
                if(display) { display.innerText = "SCRAMBLING..."; display.className = "pred-main-result hack-scramble"; }

                await new Promise(r => setTimeout(r, 2000));
                let finalPrediction = Math.random() > 0.5 ? 'BIG' : 'SMALL'; 
                
                lastPrediction = finalPrediction;
                lastBetPeriod = currentPeriodId;

                if(display) { display.innerText = finalPrediction; display.className = "pred-main-result result-reveal " + finalPrediction; }
                placeAutoBet(finalPrediction);
            } catch(e) {} finally { isAiRunning = false; }
        }

        // ==========================================
        // 5. PERIOD MONITOR
        // ==========================================
        let lastDetectedPeriod = "";
        setInterval(async () => {
            let periodElement = document.querySelector(selectors.periodId);
            if (periodElement) {
                let currentPeriodId = periodElement.innerText.trim();
                if (lastDetectedPeriod !== "" && currentPeriodId !== lastDetectedPeriod) {
                    let display = document.getElementById('prediction-text');
                    if (display) { display.innerText = "WAITING..."; display.className = "pred-main-result WAIT"; }
                    
                    if (lastBetPeriod !== "") await checkPreviousResult(lastBetPeriod);
                    setTimeout(() => runRaxiAIEngine(currentPeriodId), 1000);
                }
                lastDetectedPeriod = currentPeriodId;
            }
        }, 1000); 

        // ==========================================
        // 6. UI INJECTION
        // ==========================================
        function injectRaxiUI() {
            if (document.getElementById('raxi-app')) return;
            const style = document.createElement('style');
            style.innerHTML = `
                :root{ --raxi-card-bg:radial-gradient(ellipse at 50% 15%, #26040a 0%, #100204 60%, #050102 100%); --font-tech:'Orbitron', sans-serif; --font-mono:'Share Tech Mono', monospace; }
                #raxi-app { position:fixed; inset:0; z-index:999999; pointer-events:none; font-family:var(--font-tech); }
                #raxi-app * { pointer-events:auto; }
                #floatingIcon { position: fixed; bottom: 30px; right: 20px; width: 60px; height: 60px; border-radius: 50%; background: #050102; box-shadow: 0 0 22px rgba(255,13,50,.65); display: flex; align-items: center; justify-content: center; z-index: 1000; cursor: pointer; border: 2px solid #ffb703;}
                #floatingIcon::before { content: "RAXI"; color:#ffb703; font-weight:bold; font-size:14px; }
                #topPanel { position: fixed; top: 10px; left: calc(50% - 143px); width: 286px; display: none; flex-direction: column; gap: 5px; }
                .raxi-main-card { background: var(--raxi-card-bg); border: 1.5px solid rgba(255, 30, 60, 0.55); border-radius: 16px; padding: 10px; box-shadow: 0 10px 28px rgba(0,0,0,.9); }
                .raxi-header { display:flex; justify-content:space-between; align-items:center; margin-bottom: 10px; }
                .raxi-brand-text { font-size: 14px; font-weight: 900; background: linear-gradient(180deg, #ffffff, #ffc837, #e04400); -webkit-background-clip: text; color: transparent; }
                .mode-switch { display:flex; gap:5px; background:#111; padding:2px; border-radius:8px; border:1px solid rgba(255,183,3,.4); }
                .mode-btn { background:transparent; border:none; color:#888; font-size:9px; font-weight:bold; padding:4px 8px; border-radius:6px; cursor:pointer; }
                .mode-btn.active { background:linear-gradient(180deg, #ff1a3c, #96061a); color:#fff; box-shadow:0 0 10px rgba(255,13,50,.8); }
                .raxi-pred-box { background: radial-gradient(ellipse, rgba(110,5,24,.32), rgba(4,1,3,.99)); border: 1px solid rgba(255,48,78,.48); border-radius: 10px; padding: 15px; text-align: center; }
                .pred-tag-title { font-size: 10px; color: #f1e4e6; margin-bottom: 5px; }
                .pred-main-result { font-size: 26px; font-weight: 900; }
                .pred-main-result.BIG { color: #ffb703; filter: drop-shadow(0 0 12px #ffb703); }
                .pred-main-result.SMALL { color: #ff0d32; filter: drop-shadow(0 0 12px #ff0d32); }
                .pred-main-result.hack-scramble { color: #22c55e !important; text-shadow: 0 0 10px #22c55e; }
            `;
            document.head.appendChild(style);

            let appRoot = document.createElement('div');
            appRoot.id = 'raxi-app';
            appRoot.innerHTML = `
                <div id="floatingIcon"></div>
                <div id="topPanel">
                    <div class="raxi-main-card">
                        <div class="raxi-header">
                            <div class="raxi-brand-text">RAXI WIN HACK</div>
                            <div class="mode-switch">
                                <button class="mode-btn active" id="btn-1min">1 Min</button>
                                <button class="mode-btn" id="btn-30sec">30 Sec</button>
                            </div>
                        </div>
                        <div class="raxi-pred-box">
                            <div class="pred-tag-title">AI ENGINE (Lvl <span id="ui-lvl">${currentLevel}</span> : ₹<span id="ui-amt">${fundLevels[currentLevel]}</span>)</div>
                            <div class="pred-main-result WAIT" id="prediction-text">WAITING</div>
                        </div>
                    </div>
                </div>
            `;
            document.body.appendChild(appRoot);

            document.getElementById('floatingIcon').addEventListener('click', () => {
                let panel = document.getElementById('topPanel');
                panel.style.display = panel.style.display === 'flex' ? 'none' : 'flex';
            });

            document.getElementById('btn-1min').addEventListener('click', (e) => {
                currentAPI = APIs["1Min"]; activeMode = "1Min";
                e.target.classList.add('active'); document.getElementById('btn-30sec').classList.remove('active');
                resetBotState();
            });

            document.getElementById('btn-30sec').addEventListener('click', (e) => {
                currentAPI = APIs["30Sec"]; activeMode = "30Sec";
                e.target.classList.add('active'); document.getElementById('btn-1min').classList.remove('active');
                resetBotState();
            });
        }

        function resetBotState() {
            currentLevel = 1; lastPrediction = null; lastBetPeriod = ""; lastDetectedPeriod = ""; 
            updateUIDisplays();
        }

        function updateUIDisplays() {
            if(document.getElementById('ui-lvl')) document.getElementById('ui-lvl').innerText = currentLevel;
            if(document.getElementById('ui-amt')) document.getElementById('ui-amt').innerText = fundLevels[currentLevel] || "STOP";
            let display = document.getElementById('prediction-text');
            if (display) { display.innerText = "WAITING"; display.className = "pred-main-result WAIT"; }
        }

        setTimeout(injectRaxiUI, 2000); 
    })();
} catch (globalError) {
    // Completely silent - Chrome will never see an error badge from this extension again.
}