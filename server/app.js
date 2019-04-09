const rp = require('request-promise').defaults({ json: true })
const express = require('express')
const cors = require('cors')

const app = express()
app.use(cors())
app.get('/ac/:query', (req, res) => {
  const query = req.params.query
  rp(`https://ac.dict.naver.com/ptdic/ac?st=11&r_lt=10&q=${encodeURIComponent(query)}`)
    .then(data => res.send(data.items))
})

app.listen(3000, () => { console.log('server started' )})