import React, { useState } from 'react';
import Plotly from 'plotly.js-dist';
import Papa from 'papaparse';
import _ from 'lodash';
import * as tf from '@tensorflow/tfjs';

function App() {
  const [costData, setCostData] = useState([]);
  const [model, setModel] = useState(null);  // Persist the model
  const [trained, setTrained] = useState(false);  // Track if the model is trained
  const [lossHistory, setLossHistory] = useState([]);
  let currentMonthYear = '';

  // Add new data to the existing dataset
  const addNewData = (newData) => {
    setCostData(prevData => [...prevData, ...newData]);
  };

  Papa.parsePromise = function (file) {
    return new Promise((resolve, reject) => {
      Papa.parse(file, {
        complete: (parseData) => {
          const parsedCostData = [];
          parseData.data.forEach((row) => {
            if (row.length === 0 || row[0] === 'Item Code') return;

            if (row[0] && !row[2]) {
              currentMonthYear = row[0];
            } else if (row[0] && row[2]) {
              const productName = row[1];
              const productCost = parseFloat(row[2]);

              let monthYearEntry = parsedCostData.find(entry => entry.monthYear === currentMonthYear);
              if (!monthYearEntry) {
                monthYearEntry = { monthYear: currentMonthYear, products: [] };
                parsedCostData.push(monthYearEntry);
              }

              monthYearEntry.products.push({
                productName: productName,
                cost: productCost,
              });
            }
          });
          resolve(parsedCostData);
        },
        header: false,
      });
    });
  };

  // Handles dataset import
  const handleFileChange = async (event) => {
    const file = event.target.files[0];
    if (file) {
      const newData = await Papa.parsePromise(file);
      addNewData(newData); // Append new data
    }
  };

  // Month-Year conversion to number
  function monthYearToNumber(monthYearValue) {
    const [month, year] = monthYearValue.split(" ");
    const monthIndex = new Date(Date.parse(month + " 1, " + year)).getMonth() + 1;
    return (parseInt(year) - 2022) * 12 + monthIndex;
  }

  // Initialize or retrain the model with the current dataset
  const initializeModel = () => {
    console.log("Currently training model, please wait for results...")

    const monthYears = costData.map(d => monthYearToNumber(d.monthYear));
    const currentLossHistory = [];

    // Extract costs for each product
    const vch250gCost = costData.flatMap(entry => 
      entry.products.filter(product => product.productName === 'VIRGINIA Cocktail Hotdog 250g').map(product => product.cost)
    );

    const sh250gCost = costData.flatMap(entry => 
      entry.products.filter(product => product.productName === 'VIRGINIA Sweet Ham 250g').map(product => product.cost)
    );

    const vChH250gCost = costData.flatMap(entry => 
      entry.products.filter(product => product.productName === 'VIRGINIA Chicken Hotdog 250g').map(product => product.cost)
    );

    const cdcH250gCost = costData.flatMap(entry => 
      entry.products.filter(product => product.productName === 'VIRGINIA Chorizo de Cebu 250g').map(product => product.cost)
    );

    // Creating the model (or use an existing one)
    const newModel = model || createModel();

    const inputTensor = tf.tensor2d(monthYears, [monthYears.length, 1]);
    const labelTensor = tf.tensor2d([vch250gCost, sh250gCost, vChH250gCost,cdcH250gCost], [4, monthYears.length]);

    newModel.fit(inputTensor, labelTensor.transpose(), {
      epochs: 100,
      callbacks: {
        onEpochEnd: (epoch, logs) => {
          currentLossHistory.push(logs.loss);
        }
      }
    }).then(() => {
      console.log('Training complete');
      console.log(JSON.stringify(newModel.toJSON()))
      setModel(newModel); 
      setTrained(true);  
      setLossHistory(currentLossHistory);  
    });
  };

  // Make predictions with the trained model
  const makePrediction = () => {
    if (trained && model) {
      const prediction = model.predict(tf.tensor2d([[monthYearToNumber("January 2025")]]));
      prediction.print();
      console.log("Loss Value: " + lossHistory[lossHistory.length-1])
    } else {
      console.log("Model is not yet trained.");
    }
  };

  // Model Creation Function
  function createModel() {
    const newModel = tf.sequential();
    newModel.add(tf.layers.dense({ units: 16, inputShape: [1], activation: 'relu' }));
    newModel.add(tf.layers.dense({ units: 16, activation: 'relu' }));
    newModel.add(tf.layers.dense({ units: 4 }));
    newModel.compile({ optimizer: 'adam', loss: 'meanSquaredError' });
    return newModel;
  }

  return (
    <div className="App">
      <h1>Cost Prediction Model</h1>
      <input type="file" onChange={handleFileChange} />
      <button onClick={initializeModel}>Train Model</button>
      <button onClick={makePrediction}>Predict</button>
      <div id="outcome-cont"></div>
    </div>
  );
}

export default App;
