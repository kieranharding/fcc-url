const express = require('express')
// const http = require('http')
const path = require('path')
const base58 = require('base58')
const pg = require('pg')
const url = require('url')

// pg.defaults.ssl = true

const app = express()

const params = url.parse(process.env.DATABASE_URL);
const auth = params.auth.split(':');

const poolConfig = {
  user: auth[0],
  password: auth[1],
  host: params.hostname,
  port: params.port,
  database: params.pathname.split('/')[1]
}

const pool = new pg.Pool(poolConfig)

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname + '/index.html'))
})

app.get('/testdb', (req, response) => {
  pool.query('SELECT * FROM list', (err, result) => {
    if (err) response.end(err)
    else response.end(result.rows[0].id + ': ' + result.rows[0].url)
  })
})

app.get('/testpr', (req, response) => {
  pool.query('SELECT * FROM list')
    .then((result) => response.end(result.rows[4].id + ': ' + result.rows[4].url)
  )
    .catch((err) => response.end(err.message))
})

app.get('/new/*', (request, response) => {
  function send_result (response, original, short) { // Do I need to pass in the response? Probably not.
    response.writeHead(200, {'content-type': 'text/json'})
      const output = {
        "original_url": original,
        "short_url": 'https://kah-fcc-url.herokuapp.com/' + short
      }
    response.end(JSON.stringify(output))
  }

  if (true) { // TODO: Middleware or function to check URL validity. Why?
    const arg_url = request.params[0]
    // Check the database for the url
    pool.query('SELECT id FROM list WHERE url = $1', [arg_url], (err, result) => {
      if (err) {
        console.log(err.message, err.stack)
        response.writeHead(500, {'content-type': 'text/plain'})
        response.end('An error occured.')
      }

      // If it doesn't exist, add the url to the database
      if (result.rows.length < 1) {
        pool.query('INSERT INTO list (url) VALUES ($1) RETURNING id', [arg_url], (err, result) => {
          if (err) {
            console.log(err.message, err.stack)
            response.writeHead(500, {'content-type': 'text/plain'})
            response.end('An error occured.')
          }

        send_result(response, arg_url, base58.encode(result.rows[0].id))
          // arg_id = result.rows[0].id
        })
      } else {
        send_result(response, arg_url, base58.encode(result.rows[0].id))
        // arg_id = result.rows[0].id
      }
    })
    
    // Return a JSON string with the full and short urls
  } else {
    // res.writeHead({'content-type': 'text/plain'})
    res.end(req.params.url + ' is not a valid URL')
  }
})

app.get('/:url_id', (req, res) => {
  // If the id is base58, decode it.
  if (!/^[1-9a-km-zA-HJK-NP-Z]*$/.test(req.params.url_id)) {
    res.end(req.params.url_id + ' is not a valid code.')
  } else {
    const db_id = base58.decode(req.params.url_id)
  }
  // If the decoded id is in the database, get the url
  
  // Redirect the browser to the url
  // If the decoded id is not in the database, return an error message
})
const port = process.env.PORT || 5000
app.listen(port)
console.log('Now listening on port ' + port) 