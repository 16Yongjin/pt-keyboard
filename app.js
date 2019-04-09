const keyDowns = Rx.Observable.fromEvent(document, 'keydown')

const keyUps = Rx.Observable.fromEvent(document, 'keyup')

// 키 입력 이벤트 만들기
const keyEvents = keyDowns
  .merge(keyUps)
  .groupBy(e => e.keyCode)
  .map(group => group.distinctUntilChanged(null, e => e.type))
  .mergeAll()

// 키 입력 이벤트에서 charCode랑 같은 거 있으면 스트림 흘려 보내기
const createKeyPressStream = (charCode) => {
  return {
    char: charCode,
    stream: keyEvents
      .filter(event => event.keyCode === charCode)
      .map(e =>e.type)
  }
}

// 단축키 문자열 들어오면 검증 한 뒤, 각각 코드들 스트림에 집어 넣고
const createShortcutStream = (text) => {
return Rx.Observable
  .from(text.split('+'))
  .map( c => {
    const code = keyCodeMap[c.toLowerCase()]
    if (code === undefined) {
      throw new Error('Invalid sequence ' + text)
    }
    return code
  })
  .map(createKeyPressStream)
  .map(obj => obj.stream) 
  .toArray()
  .flatMap( arr => Rx.Observable.combineLatest(arr) ) // 각각의 키 스트림에서 마지막 이벤트들 합치기
  .filter( arr => { // 키 스트림이 모두 keydown 인 것만 흘려보냄
    let isDown = true
    for (let i = 0; i < arr.length; i++) {
      isDown = isDown && (arr[i] === 'keydown')
    }
    return isDown
  })
  .map( x => text )
}

// 입력받은 키 문자열 형식 검증하기
const validateSeq = text => {
  const arr = text.split('+')
  for (let i = 0; i < arr.length; i++) {
    if(keyCodeMap[arr[i].toLowerCase()] === undefined) {
      return false
    }
  }
  return true
}

const stress = {
  acute: { a: 'á', e: 'é', i: 'í', o: 'ó', u: 'ú '},
  circum: { a: 'â', e: 'ê', i: 'î', o: 'ô', u: 'û' },
  grave: { a: 'à', e: 'è', i: 'ì', o: 'ì', u: 'ù' },
  tilde: { a: 'ã', o: 'õ', n: 'ñ' }
}

const stressSymbol = { acute: '´', circum: 'ˆ', grave: '`', tilde: '˜' }
const isStressSymbol = { '´': 'acute: ', 'ˆ': 'circum', '`': 'grave', '˜': 'tilde' }

const keyCodeId = {
  'Ctrl+E': 'acute', 
  'Ctrl+I': 'circum',
  'Ctrl+N': 'tilde',
  'grave accent': 'grave'
}

// 새로운 단축키 등록 이벤트 관찰
const shortuctSequences = Rx.Observable
    .of('Ctrl+E', 'Ctrl+I', 'Ctrl+N', 'grave accent') // 초기값 흘리기
    .map( text => {
      return {
        id: keyCodeId[text],
        text: text
      }
    })

const validShortcuts = shortuctSequences.filter( seq => validateSeq(seq.text) )

const invalidShortcuts = shortuctSequences.filter( seq => !validateSeq(seq.text) )

const shortCutPrompts = validShortcuts
  .flatMap( shortcutSeqObj => createShortcutStream(shortcutSeqObj.text).map(() => shortcutSeqObj.id))

let ctx = null
const textarea = document.getElementById("myTextarea")
String.prototype.replaceAt = function(index, replacement) {
  return this.substr(0, index) + replacement + this.substr(index + replacement.length);
}

String.prototype.insertAt = function(index, text) {
  return this.substr(0, index) + text + this.substr(index);
}

function setSelectionRange(input, start, end) {
  if (is_gecko) {
    input.setSelectionRange(start, end);
  } else {
    // assumed IE
    var range = input.createTextRange();
    range.collapse(true);
    range.moveStart("character", start);
    range.moveEnd("character", end - start);
    range.select();
  }
};

document.onkeydown = e => {
  if (ctx && stress[ctx][e.key] && isStressSymbol[textarea.value[e.target.selectionStart - 1]]) {
    textarea.value = textarea.value.replaceAt(e.target.selectionStart - 1, stress[ctx][e.key])
    ctx = null
    return false
  }
  ctx = null
}

shortCutPrompts.subscribe(obj => {
  ctx = obj
  const cursorPos = textarea.selectionStart
  textarea.value = textarea.value.insertAt(cursorPos, stressSymbol[obj])
  textarea.selectionEnd = cursorPos
  textarea.selectionEnd = cursorPos
})
