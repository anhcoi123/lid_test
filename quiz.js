;(function(){
  // -------------- Konfiguration & State --------------
  const ALL_ITEMS = window.list_items || []
  const NUM_QUESTIONS = 33
  let items = []
  let current = 0
  let btnEndTest = null
  let mode = 'test' // 'test' oder 'katalog'

  // -------------- DOM References --------------
  const selJump   = document.getElementById('select-jump')
  const btnNext   = document.getElementById('btn-next')
  const btnPrev   = document.getElementById('btn-prev')
  const prog      = document.getElementById('quiz-progress')
  const qImage    = document.getElementById('quiz-image')
  const qText     = document.getElementById('quiz-text')
  const qAnswers  = document.getElementById('quiz-answers')
  const qError    = document.getElementById('quiz-error')
  const btnTest    = document.getElementById('btn-test')
  const btnKatalog = document.getElementById('btn-katalog')

  // -------------- Initialisierung --------------
  document.addEventListener('DOMContentLoaded', init)

  function init() {
    createImageOverlay()
    if (mode === 'katalog') {
      startKatalogMode()
    } else {
      items = getRandomQuestions(ALL_ITEMS, NUM_QUESTIONS)
      current = 0
      const qParam = parseInt(getQueryParam('q'), 10)
      if (!isNaN(qParam) && qParam > 0 && qParam <= items.length) {
        current = qParam - 1
      }
      if (!items.length) {
        qText.textContent = 'Keine Fragen gefunden.'
        btnNext.disabled = true
        return
      }
      buildJumpSelect()
      addEndTestButton()
      bindEvents()
      renderQuestion()
    }

    // Modus-Umschaltung: Test / Fragen Katalog
    if (btnTest && btnKatalog) {
      btnTest.addEventListener('click', () => {
        mode = 'test'
        btnTest.classList.add('active')
        btnKatalog.classList.remove('active')
        startTestMode()
      })
      btnKatalog.addEventListener('click', () => {
        mode = 'katalog'
        btnKatalog.classList.add('active')
        btnTest.classList.remove('active')
        startKatalogMode()
      })
    }
  }

  // -------------- Hilfsfunktionen --------------
  function getQueryParam(name) {
    const params = new URLSearchParams(window.location.search)
    return params.get(name)
  }

  function getRandomQuestions(arr, n) {
    // Hilfsfunktion zum Mischen eines Arrays
    function shuffle(array) {
      for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
        ;[array[i], array[j]] = [array[j], array[i]]
      }
      return array
    }
    const shuffled = arr.slice().sort(() => Math.random() - 0.5)
    return shuffled.slice(0, Math.min(n, arr.length)).map(q => {
      // Antworten und Index mischen NUR im Testmodus
      if (mode === 'test') {
        const answerPairs = q.answers.map((ans, idx) => ({ ans, idx }))
        const shuffledAnswers = shuffle(answerPairs)
        const newAnswers = shuffledAnswers.map(pair => pair.ans)
        const newCorrect = shuffledAnswers.findIndex(pair => pair.idx === q.correctAnswerIndex)
        return { ...q, answers: newAnswers, correctAnswerIndex: newCorrect }
      } else {
        return { ...q, answers: q.answers.slice(), correctAnswerIndex: q.correctAnswerIndex }
      }
    })
  }

  // -------------- UI: Overlay für Bild-Zoom --------------
  function createImageOverlay() {
    if (document.getElementById('image-zoom-overlay')) return
    const overlay = document.createElement('div')
    overlay.id = 'image-zoom-overlay'
    overlay.style.cssText = `
      display: none; position: fixed; z-index: 9999; left: 0; top: 0; width: 100vw; height: 100vh;
      background: rgba(0,0,0,0.8); justify-content: center; align-items: center; cursor: zoom-out;`
    overlay.innerHTML = '<img id="zoomed-img" style="max-width:66vw; max-height:66vh; box-shadow:0 0 20px #000; border-radius:8px; transform:scale(1.5); transition:transform 0.2s;">'
    overlay.addEventListener('click', () => overlay.style.display = 'none')
    document.body.appendChild(overlay)
  }

  function showImageOverlay(src) {
    const overlay = document.getElementById('image-zoom-overlay')
    const img = overlay.querySelector('#zoomed-img')
    img.src = src
    overlay.style.display = 'flex'
  }

  // -------------- UI: Dropdown & End-Test-Button --------------
  function buildJumpSelect() {
    selJump.innerHTML = ''
    items.forEach((_, idx) => {
      const opt = document.createElement('option')
      opt.value = idx
      opt.textContent = `Frage ${idx+1}`
      selJump.append(opt)
    })
    // Dropdown an neue Position verschieben und stylen
    selJump.style.position = 'fixed'
    selJump.style.right = '2vw'
    selJump.style.bottom = '2vw'
    selJump.style.zIndex = '10001'
    selJump.style.padding = '0.5em 1.5em'
    selJump.style.borderRadius = '2em'
    selJump.style.boxShadow = '0 2px 8px rgba(0,0,0,0.15)'
    selJump.style.background = '#fff'
    selJump.style.border = '1px solid #bbb'
    selJump.style.fontSize = '1.1em'
    selJump.style.cursor = 'pointer'
    selJump.title = 'Zu Frage springen'
    if (!document.body.contains(selJump)) document.body.appendChild(selJump)
  }

  function addEndTestButton() {
    if (!document.getElementById('btn-endtest')) {
      btnEndTest = document.createElement('button')
      btnEndTest.id = 'btn-endtest'
      btnEndTest.textContent = 'Test beenden'
      btnEndTest.type = 'button'
      btnEndTest.style.marginLeft = '1em'
      document.getElementById('quiz-header').appendChild(btnEndTest)
    } else {
      btnEndTest = document.getElementById('btn-endtest')
    }
    btnEndTest.onclick = showResult
  }

  // -------------- UI: Frage anzeigen --------------
  function renderQuestion() {
    current = Math.max(0, Math.min(current, items.length - 1))
    const item = items[current]
    prog.textContent = `Frage ${current+1} / ${items.length}`
    btnPrev.classList.toggle('hidden', current === 0)
    btnNext.textContent = (current === items.length - 1) ? 'Abschließen' : 'Weiter'
    selJump.value = current

    // Bild
    if (item.questionImage) {
      const imgSrc = `./question_images/${item.questionImage}.png`
      qImage.innerHTML = `<img src="${imgSrc}"
                              alt="" loading="lazy" id="quiz-img-inner" style="cursor:zoom-in;">`
      const img = document.getElementById('quiz-img-inner')
      img.addEventListener('click', () => showImageOverlay(imgSrc))
    } else {
      qImage.innerHTML = ''
    }

    // Text
    qText.textContent = item.questionText

    // Antworten
    qAnswers.innerHTML = ''
    item.answers.forEach((ans, i) => {
      const id = `answer_${i}`
      const div = document.createElement('div')
      div.className = 'answer-option'
      const checked = (item.userAnswer === i) ? 'checked' : ''
      div.innerHTML = `
        <input type="radio" name="answer" id="${id}" value="${i}" ${checked}>
        <label for="${id}">${ans}</label>
      `
      qAnswers.append(div)
    })
    // Markierung für bereits beantwortete Fragen anzeigen
    if (typeof item.userAnswer === 'number') {
      markAnswers(item.userAnswer)
    } else {
      Array.from(qAnswers.children).forEach(div => {
        div.classList.remove('answer-correct', 'answer-wrong')
      })
    }
  }

  // -------------- UI: Bewertung & Neustart --------------
  function showResult() {
    if (mode === 'katalog') {
      prog.textContent = 'Fragenkatalog – keine Bewertung'
      qText.innerHTML = '<div class="quiz-result"><h2>Fragenkatalog</h2><p>Alle Fragen werden angezeigt. Es gibt keine Bewertung.</p><button id="btn-restart">Zurück zum Test</button></div>'
      qAnswers.innerHTML = ''
      qImage.innerHTML = ''
      btnNext.classList.add('hidden')
      btnPrev.classList.add('hidden')
      selJump.classList.add('hidden')
      if (btnEndTest) btnEndTest.classList.add('hidden')
      document.getElementById('btn-restart').addEventListener('click', () => {
        mode = 'test'
        btnTest.classList.add('active')
        btnKatalog.classList.remove('active')
        startTestMode()
      })
      return
    }
    let correct = 0
    items.forEach((item) => {
      if (item.userAnswer !== undefined && item.userAnswer === item.correctAnswerIndex) correct++
    })
    const percent = Math.round((correct / items.length) * 100)
    const passed = correct >= 17
    const resultHtml = `
      <div class="quiz-result">
        <h2>Bewertung</h2>
        <p>Richtige Antworten: <b>${correct}</b> von <b>${items.length}</b></p>
        <p>Prozent: <b>${percent}%</b></p>
        <p>${passed ? 'Bestanden! 🎉' : 'Nicht bestanden.'}</p>
        <button id="btn-restart">Neustart</button>
      </div>
    `
    qImage.innerHTML = ''
    qText.innerHTML = resultHtml
    qAnswers.innerHTML = ''
    prog.textContent = 'Test abgeschlossen'
    btnNext.classList.add('hidden')
    btnPrev.classList.add('hidden')
    selJump.classList.add('hidden')
    if (btnEndTest) btnEndTest.classList.add('hidden')
    document.getElementById('btn-restart').addEventListener('click', restartQuiz)
  }

  function restartQuiz() {
    items = getRandomQuestions(ALL_ITEMS, NUM_QUESTIONS)
    current = 0
    btnNext.classList.remove('hidden')
    btnPrev.classList.add('hidden')
    selJump.classList.remove('hidden')
    if (btnEndTest) btnEndTest.classList.remove('hidden')
    renderQuestion()
  }

  function startTestMode() {
    items = getRandomQuestions(ALL_ITEMS, NUM_QUESTIONS)
    current = 0
    buildJumpSelect()
    btnNext.classList.remove('hidden')
    btnPrev.classList.add('hidden')
    selJump.classList.remove('hidden')
    if (btnEndTest) btnEndTest.classList.remove('hidden')
    renderQuestion()
  }

  function startKatalogMode() {
    items = ALL_ITEMS.map(q => ({ ...q, answers: q.answers.slice(), correctAnswerIndex: q.correctAnswerIndex }))
    current = 0
    buildJumpSelect()
    btnNext.classList.remove('hidden')
    btnPrev.classList.add('hidden')
    selJump.classList.remove('hidden')
    if (btnEndTest) btnEndTest.classList.add('hidden')
    renderQuestion()
  }

  // -------------- Event-Handler --------------
  function bindEvents() {
    btnNext.addEventListener('click', () => {
      const chosen = qAnswers.querySelector('input[type=radio]:checked')
      if (chosen) items[current].userAnswer = parseInt(chosen.value, 10)
      if (current < items.length - 1) {
        current++
        renderQuestion()
      }
    })
    btnPrev.addEventListener('click', () => {
      if (current > 0) {
        current--
        renderQuestion()
      }
    })
    selJump.addEventListener('change', () => {
      current = parseInt(selJump.value, 10)
      renderQuestion()
    })
    qAnswers.addEventListener('click', e => {
      if (e.target.matches('input[type=radio]')) {
        qError.classList.add('hidden')
        markAnswers(e.target.value)
        items[current].userAnswer = parseInt(e.target.value, 10)
      }
    })
  }

  // -------------- Hilfsfunktion: Antwort markieren --------------
  function markAnswers(selectedValue) {
    const idx = parseInt(selectedValue, 10)
    const correct = items[current].correctAnswerIndex
    Array.from(qAnswers.children).forEach((div, i) => {
      div.classList.remove('answer-correct', 'answer-wrong')
      if (i === correct) {
        div.classList.add('answer-correct')
      } else if (i === idx && i !== correct) {
        div.classList.add('answer-wrong')
      }
    })
  }

  // -------------- Hilfsfunktion: Auswahl prüfen --------------
  function validateSelection() {
    const chosen = qAnswers.querySelector('input[type=radio]:checked')
    if (!chosen) {
      qError.classList.remove('hidden')
      return false
    }
    qError.classList.add('hidden')
    markAnswers(chosen.value)
    return true
  }

})();
