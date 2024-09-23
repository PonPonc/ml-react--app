const express = require('express');
const fs = require('fs');
const app = express();

app.use(express.json());

app.get('/read-file', (req, res) => {
  fs.readFile('files/fg-costs-combined3.csv', (err, data) => {
    if (err) {
      return res.status(500).send('Error reading file');
    }
    res.send(data);
  });
});

const port = process.env.PORT || 5000;
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
