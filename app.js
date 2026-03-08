const $ = (id) => document.getElementById(id);

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function escapeHtml(str) {
  const el = document.createElement("span");
  el.textContent = str;
  return el.innerHTML;
}

function highlightCode(code) {
  let c = escapeHtml(code);
  c = c.replace(/(#.*)/g, '<span class="cm">$1</span>');
  c = c.replace(/(".*?")/g, '<span class="str">$1</span>');
  c = c.replace(/\b(\d+\.?\d*)\b/g, '<span class="num">$1</span>');

  const fns = [
    "mean", "c", "sd", "rnorm", "data\\.frame", "filter", "group_by",
    "summarise", "print", "factor", "lm", "t\\.test", "cor", "ggplot",
    "aes", "geom_point", "geom_histogram", "geom_boxplot", "geom_bar",
    "shapiro\\.test", "library", "install\\.packages", "aov", "chisq\\.test",
    "read\\.csv", "str", "summary", "head", "select", "mutate", "arrange",
    "desc", "pivot_longer", "pivot_wider", "left_join", "facet_wrap",
    "labs", "ggsave", "theme_minimal", "seq",
  ];
  fns.forEach((fn) => {
    c = c.replace(new RegExp("\\b(" + fn + ")\\b", "g"), '<span class="fn">$1</span>');
  });

  c = c.replace(
    /\b(for|in|if|else|function|return|TRUE|FALSE|NA|NULL)\b/g,
    '<span class="kw">$1</span>'
  );
  return c;
}

function triggerAnimation(el) {
  el.style.animation = "none";
  el.offsetWidth; // reflow
  el.style.animation = "slideUp 0.4s ease";
}

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// Build section selection grid on load
function buildSectionGrid() {
  const grid = $("section-grid");
  const counts = {};
  QUESTIONS.forEach((q) => {
    counts[q.section] = (counts[q.section] || 0) + 1;
  });

  grid.innerHTML = Object.entries(SECTIONS)
    .map(
      ([key, sec]) => `
      <div class="section-card" onclick="quiz.start('${key}')">
        <span class="section-emoji">${sec.emoji}</span>
        <div class="section-label">${sec.label}</div>
        <div class="section-desc">${sec.desc}</div>
        <span class="section-count">${counts[key] || 0} Fragen</span>
      </div>`
    )
    .join("");
}

const quiz = {
  current: 0,
  score: 0,
  streak: 0,
  maxStreak: 0,
  answered: false,
  facts: [],
  questions: [],
  gifIndex: 0,

  start(section) {
    this.current = 0;
    this.score = 0;
    this.streak = 0;
    this.maxStreak = 0;
    this.gifIndex = 0;
    this.facts = shuffle(CAT_FACTS);

    if (section === "all") {
      this.questions = shuffle(QUESTIONS);
    } else {
      this.questions = shuffle(QUESTIONS.filter((q) => q.section === section));
    }

    if (this.questions.length === 0) return;

    $("start-screen").classList.add("hidden");
    $("result-screen").classList.add("hidden");
    $("quiz-screen").classList.remove("hidden");
    this.render();
  },

  render() {
    this.answered = false;
    const q = this.questions[this.current];
    const total = this.questions.length;
    const letters = ["A", "B", "C", "D"];

    $("progress-fill").style.width = (this.current / total) * 100 + "%";
    $("progress-text").textContent = `${this.current + 1} / ${total}`;
    $("streak-val").textContent = this.streak;
    $("score-val").textContent = this.score;

    const optionsHtml = q.options
      .map(
        (opt, i) =>
          `<button class="option-btn" onclick="quiz.answer(${i})" data-idx="${i}">
            <span class="opt-letter">${letters[i]}</span>
            <span>${escapeHtml(opt)}</span>
          </button>`
      )
      .join("");

    $("question-card").innerHTML = `
      <div class="q-category">${q.category}</div>
      <div class="q-context">${q.context}</div>
      <div class="q-text">${q.question}</div>
      ${q.code ? `<div class="q-code">${highlightCode(q.code)}</div>` : ""}
      <div class="options">${optionsHtml}</div>
      <div id="feedback"></div>
    `;
  },

  answer(idx) {
    if (this.answered) return;
    this.answered = true;

    const q = this.questions[this.current];
    const isCorrect = idx === q.correct;
    const btns = document.querySelectorAll(".option-btn");

    btns.forEach((b) => (b.disabled = true));

    if (isCorrect) {
      this.score++;
      this.streak++;
      if (this.streak > this.maxStreak) this.maxStreak = this.streak;
      btns[idx].classList.add("correct");
      if (this.streak >= 3) this.showStreakPopup();
    } else {
      this.streak = 0;
      btns[idx].classList.add("wrong");
      btns[q.correct].classList.add("correct");
    }

    $("score-val").textContent = this.score;
    $("streak-val").textContent = this.streak;

    const isLast = this.current >= this.questions.length - 1;
    const fact = this.facts[this.current % this.facts.length];
    const btnAction = isLast ? "quiz.showResults()" : "quiz.next()";
    const btnLabel = isLast ? "Ergebnis anzeigen 🏆" : "Nächste Frage →";

    // cache-bust with timestamp to get a different cat each time
    const catGif = `https://cataas.com/cat/gif?t=${Date.now()}`;

    $("feedback").innerHTML = `
      <div class="explanation">
        ${isCorrect ? "✅ <strong>Richtig!</strong> " : "❌ <strong>Leider falsch.</strong> "}
        ${q.explanation}
      </div>
      <div class="cat-gif-wrap">
        <img src="${catGif}" alt="Zufällige Katze" loading="lazy">
      </div>
      <div class="cat-fact">
        <span class="cat-fact-emoji">🐱</span>
        <span>${fact}</span>
      </div>
      <button class="btn-primary btn-full" onclick="${btnAction}">${btnLabel}</button>
    `;
  },

  next() {
    this.current++;
    triggerAnimation($("question-card"));
    this.render();
  },

  showStreakPopup() {
    const el = $("streak-popup");
    const msg = STREAK_MESSAGES[this.streak] || `👑 LEGENDÄR! ${this.streak}x`;
    el.textContent = msg;
    el.classList.remove("show");
    el.offsetWidth; // reflow
    el.classList.add("show");
  },

  showResults() {
    $("quiz-screen").classList.add("hidden");

    const pct = Math.round((this.score / this.questions.length) * 100);
    const tier = RESULT_TIERS.find((t) => pct >= t.min);

    const rs = $("result-screen");
    rs.innerHTML = `
      <div class="result-mascot">${tier.mascot}</div>
      <div class="result-score">${pct}%</div>
      <div class="result-title">${tier.title}</div>
      <div class="result-desc">${tier.desc}</div>
      <div class="result-stats">
        <div class="result-stat">
          <div class="val">${this.score}/${this.questions.length}</div>
          <div class="label">Richtig</div>
        </div>
        <div class="result-stat">
          <div class="val">${this.maxStreak}</div>
          <div class="label">Beste Streak</div>
        </div>
      </div>
      <div class="result-buttons">
        <button class="btn-primary btn-lg" onclick="quiz.backToMenu()">Thema wählen 📚</button>
      </div>
    `;
    rs.classList.remove("hidden");
    triggerAnimation(rs);
  },

  backToMenu() {
    $("result-screen").classList.add("hidden");
    $("quiz-screen").classList.add("hidden");
    $("start-screen").classList.remove("hidden");
  },
};

// Initialize section grid on load
buildSectionGrid();
