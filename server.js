// server imports
import express from 'express';
import cors from 'cors';
import knex from 'knex';
import dotenv from 'dotenv';

// work allocation planner imports
import getName from './planner-controllers/name.js';
import getLocale from './planner-controllers/locale.js';
import getTeamName from './planner-controllers/teamName.js';
import getTeamMembers from './planner-controllers/teamMembers.js';
import getWorkload from './planner-controllers/workload.js';
import handleAssign from './planner-controllers/assign.js';
import handleUnclaim from './planner-controllers/unclaim.js';
import handleMarkDone from './planner-controllers/markDone.js';
import getTaskCount from './planner-controllers/taskCount.js';
import getAllTasks from './planner-controllers/allTasks.js';
import getTask from './planner-controllers/task.js';
import getTeamTaskCount from './planner-controllers/teamTaskCount.js';
import getTeamAllTasks from './planner-controllers/teamAllTasks.js';

// memoQ plugin imports
import handleGptTranslate from './memoQ-controllers/gptTranslate.js';

/**
 * This is the main entry point for the backend server.
 * 
 * The server is built using Express.js, and uses Knex.js to connect to the PostgreSQL database.
 * 
 * The server contains endpoints for the following:
 * 1. Work Allocation Planner
 * 2. Prompt Tool/Content Editor/Humour Responder
 * 3. MemoQ Plugin
 * 
 * The endpoints for each of the above are defined in their respective controllers.
 * 
 * The server is hosted on naga
 */

// Load the environment variables from the .env file
dotenv.config();
const openaiApiKey = process.env.OPENAI_API_KEY;
const port = process.env.PORT || 3001;

const app = express();

app.use(express.json());
app.use(cors());

//////////////////////////////////////////////
// Endpoints for "Work Allocation Planner"  //
//////////////////////////////////////////////

// The database for the prototype
const db = knex({
  client: 'pg',
  connection: {
    host : '127.0.0.1',
    port : 5432,
    user : 'ken',
    password : 'test',
    database : 'planner'
  }
});

// Get the fullname of the user, based on the provided username
app.get('/name/:username', (req, res) => { getName(req, res, db) });

// Get the locale of the user, based on the provided username
app.get('/locale/:username', (req, res) => { getLocale(req, res, db) });

// Get the user's team-name(centre), based on the provided username
app.get('/team-name/:username', (req, res) => { getTeamName(req, res, db) });

// Get the task details based on the provided task_id
app.get('/task/:task_id', (req, res) => { getTask(req, res, db) });

// Get the list of members in the same team(centre), based on the provided team(centre)
// NOTE: Maybe change this endpoint to return users that match both the team and locale
app.get('/team-members/:team', (req, res) => { getTeamMembers(req, res, db) });

// Obtain the workload data, based on the provided username and requested dates, username in req.params, dates in req.body
app.post('/workload/:username', (req, res) => { getWorkload(req, res, db) });

// Assign a username to a task based on the provided task_id and username
app.put('/assign', (req, res) => { handleAssign(req, res, db) });

// Unassign a task based on the provided task_id
app.put('/unclaim', (req, res) => { handleUnclaim(req, res, db) });

// Mark a task status as Done
app.put('/markDone', (req, res) => { handleMarkDone(req, res, db) });

// Get the total count of tasks assigned to the user that are not in 'Done' status.
app.get('/taskCount/:username', (req, res) => { getTaskCount(req, res, db) });

// Get the list of tasks assigned to the user that are not in 'Done' status.
app.get('/allTasks/:username', (req, res) => { getAllTasks(req, res, db) });

// Get the total count of tasks assigned to the team(centre) that are not in 'Done' status.
app.get('/teamTaskCount/:team', (req, res) => { getTeamTaskCount(req, res, db) });

// Get the list of tasks assigned to the team(centre) that are not in 'Done' status.
app.get('/teamAllTasks/:team', (req, res) => { getTeamAllTasks(req, res, db) });


//////////////////////////////////////////////////////////////////
// Endpoints for the Prompt Tool/Content Editor/Humour Responder //
//////////////////////////////////////////////////////////////////

app.get('/apikey', (req, res) => {
	res.json({ key: openaiApiKey });
});


////////////////////////////////////
// Endpoints for the MemoQ Plugin //
////////////////////////////////////

app.get('/test', (req, res) => {
	res.json('hello Jorge!')
});

app.post('/gptTranslate', (req, res) => { handleGptTranslate(req, res) });

// Start the server
app.listen(port, ()=> {
	console.log(`Server running on port ${port}`);
});

app.get('/', (req, res) => {
	res.send('Server running as usual, nothing to see here.');
});