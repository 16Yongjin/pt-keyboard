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

// 새로운 단축키 등록 이벤트 관찰
const shortuctSequences = Rx.Observable
  .fromEvent(document.querySelector('button'), 'click')
  .map( () => document.querySelector('input').value )
    .startWith('Ctrl+Alt+D', 'Ctrl+Shift+S', 'Trash') // 초기값 흘리기
    .map( text => {
      return {
        id: text.replace(/\+/g,'_'),
        text: text
      }
    })

const validShortcuts = shortuctSequences.filter( seq => validateSeq(seq.text) )

const invalidShortcuts = shortuctSequences.filter( seq => !validateSeq(seq.text) )

const shortCutPrompts = validShortcuts
  .flatMap( shortcutSeqObj =>
    createShortcutStream(shortcutSeqObj.text)
      .scan(acc => acc + 1, 0)
      .map( count => {
        return {
          id: shortcutSeqObj.id,
          count: count
        }
      })
  )

// Subscriptions for Side Effects
validShortcuts.subscribe( seq => {
    const tmpl = '<li id="' + seq.id + '"><span>' + seq.text + ': </span><span>0</span></li>'
    const li = $(tmpl)
    $('ul').append(li)
  }
)

// 잘못된 단축키를 뷰에 반영
invalidShortcuts.subscribe( seq => {
    const tmpl = '<li style="color: red">Invalid sequence ' + seq.text + '</li>'
    const li = $(tmpl)
    $('ul').append(li)
  }
)

// 단축키 눌렸을 때 눌린 횟수 업데이트를 뷰에 반영
shortCutPrompts.subscribe(
  obj => $('ul > li#' + obj.id + ' > span').eq(1).text(obj.count)
)