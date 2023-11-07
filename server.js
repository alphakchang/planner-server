import express from 'express';
import cors from 'cors';
import knex from 'knex';

const app = express();

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

app.use(express.json());
app.use(cors());

app.get('/', (req, res) => {
	db.select('*').from('users')
	.then(response => {
		res.json(response[0]);
	})
});

// Get the Full Name of the user
app.get('/name/:username', (req, res) => {
    const { username } = req.params;
	
	db.select('*').from('users')
        .where({
            username: username
        })
        .then(user => {
            if (user.length) {
                res.json(user[0].name)
            } else {
                res.status(400).json('Not Found')
            }
        })
        .catch(err => res.status(400).json('Error getting user'))
});

// Get the Locale of the user
app.get('/locale/:username', (req, res) => {
    const { username } = req.params;
	
	db.select('*').from('users')
        .where({
            username: username
        })
        .then(user => {
            if (user.length) {
                res.json(user[0].locale)
            } else {
                res.status(400).json('Not Found')
            }
        })
        .catch(err => res.status(400).json('Error getting user'))
});

// Obtain the workload data of requested dates
app.post('/workload/:username', (req, res) => {
    const { username } = req.params;
	
	db.select('*').from('workload')
        .where({
            username: username
        })
        .then(user => {
            if (user.length) {
				if (user[0][req.body.date]) {
					res.json(user[0][req.body.date])
				} else {
					res.json(0) // workload is 0 if the date is not in the database
				}
            } else {
                res.status(400).json('Not Found')
            }
        })
        .catch(err => res.status(400).json('Error getting user'))
});


app.put('/assign', (req, res) => {
    const { task_id, username } = req.body;

    // Check if the input is valid
    if (!task_id || !username) {
        return res.status(400).send('Task ID and username must be provided');
    }

    let requiredHours, deadline, oldUsername;

    // Start the transaction
    db.transaction(async trx => {
        try {
            // Get the task's required hours, deadline, and current assigned username
            const task = await trx('tasks').where({ task_id }).first();
            if (!task) {
                throw new Error('Task not found');
            }
            requiredHours = task.required_hours;
            deadline = new Date(task.deadline).toISOString().split('T')[0].split('-').reverse().join('-'); // Format as DD-MM-YYYY
            oldUsername = task.username; // Store the old username if the task is already assigned

            // If the task is already assigned to another user, update their workload
            if (task.status === 'Assigned' && oldUsername && oldUsername !== username) {
                // Decrease hours from old user's workload
                await trx('workload')
                    .where({ username: oldUsername })
                    .update({ [deadline]: trx.raw(`?? - ?`, [deadline, requiredHours]) });

                // Make sure the workload doesn't go below 0
                await trx('workload').where({ username: oldUsername }).andWhere(deadline, '<', 0).update({ [deadline]: 0 });
            }

            // Update the task status and username
            await trx('tasks').where({ task_id }).update({ status: 'Assigned', username });

            // Check if the column exists in the workload table
            const columnExists = await trx.schema.hasColumn('workload', deadline);
            if (!columnExists) {
                // Add the column to the workload table
                await trx.schema.table('workload', table => {
                    table.decimal(deadline).defaultTo(0);
                });
            }

            // Update the workload for the new user
            const newWorkload = await trx('workload').where({ username }).first();
            if (newWorkload) {
                // Update existing workload
                await trx('workload')
                    .where({ username })
                    .update({ [deadline]: trx.raw(`?? + ?`, [deadline, requiredHours]) });
            } else {
                // Insert new workload entry if not exist
                await trx('workload').insert({ username, [deadline]: requiredHours });
            }

            // Commit the transaction
            await trx.commit();
            res.json({ task_id, username, status: 'Assigned', required_hours: requiredHours, deadline });

        } catch (error) {
            // If any errors occurred, rollback the transaction
            await trx.rollback();
            res.status(500).send(error.message);
        }
    });
});

app.put('/unclaim', (req, res) => {
    const { task_id } = req.body;

    // Check if the input is valid
    if (!task_id) {
        return res.status(400).send('Task ID must be provided');
    }

    let requiredHours, deadline, username;

    // Start the transaction
    db.transaction(async trx => {
        try {
            // Get the task's required hours, deadline, and assigned username
            const task = await trx('tasks').where({ task_id }).first();
            if (!task) {
                throw new Error('Task not found');
            }
            if (task.status !== 'Assigned') {
                throw new Error('Task is not currently assigned');
            }

            requiredHours = task.required_hours;
            deadline = new Date(task.deadline).toISOString().split('T')[0].split('-').reverse().join('-'); // Format as DD-MM-YYYY
            username = task.username;

            // Deduct the required hours from the user's workload
            await trx('workload')
                .where({ username })
                .update({ [deadline]: trx.raw(`?? - ?`, [deadline, requiredHours]) });

            // Make sure the workload doesn't go below 0
            await trx('workload').where({ username }).andWhere(deadline, '<', 0).update({ [deadline]: 0 });

            // Update the task to unassign it
            await trx('tasks').where({ task_id }).update({ username: '', status: 'Unassigned' });

            // Commit the transaction
            await trx.commit();
            res.json({ task_id, status: 'Unassigned', message: 'Task has been unclaimed successfully' });

        } catch (error) {
            // If any errors occurred, rollback the transaction
            await trx.rollback();
            res.status(500).send(error.message);
        }
    });
});


// Mark a task status as Done
app.put('/markDone', (req, res) => {
    const { task_id } = req.body;

    if (!task_id) {
        return res.status(400).send('Task ID must be provided');
    }

    db.transaction(trx => {
        trx('tasks')
            .where({ task_id: task_id })
            .update({
                status: 'Done',
            })
            .then(result => {
                if (result) {
                    return trx('tasks')
                        .where({ task_id: task_id })
                        .select('*');
                } else {
                    return Promise.reject(new Error('Task not found'));
                }
            })
            .then(rows => {
                trx.commit();
                res.json(rows[0]);
            })
            .catch(error => {
                trx.rollback();
                res.status(500).send(error.message);
            });
    }).catch(error => {
        // This will handle any error that occurs during the transaction.
        res.status(500).send(error.message);
    });
});



// Get the total task count currently assigned to the user, excluding tasks with status 'Done'
app.get('/taskCount/:username', (req, res) => {
	const { username } = req.params;
	
	db.select('*').from('tasks')
		.where({
			username: username
		})
		.andWhere('status', '<>', 'Done')
		.then(occurance => {
			res.json(occurance.length);
		})
		.catch(err => {
			res.status(500).json('An error occurred while fetching the total task count');
		})
});

// Get the list of tasks assigned to the user, excluding tasks with status 'Done'
app.get('/allTasks/:username', (req, res) => {
    const { username } = req.params;

    db.select('*').from('tasks')
		.where({
			username: username
		})
		.andWhere('status', '<>', 'Done')
        .orderBy('deadline', 'asc')
		.then(data => {
			res.json(data);
		})
		.catch(err => {
			res.status(500).json('An error occurred while fetching the task data');
		})
});

// Send the task row
app.get('/task/:task_id', (req, res) => {
    const { task_id } = req.params;

    db.select('*').from('tasks')
        .where({
            task_id: task_id
        })
        .then(task => {
            if (task.length) {
                res.json(task[0]);
            } else {
                res.status(400).json('Task not found');
            }
        })
        .catch(err => res.status(400).json('Error getting task'))
});

// Get the user's team(centre)
app.get('/team-name/:username', (req, res) => {
    const { username } = req.params;

    db.select('*').from('users')
        .where({
            username: username
        })
        .then(user => {
            if (user.length) {
                res.json(user[0].team);
            } else {
                res.status(400).json('User not found');
            }
        })
        .catch(err => res.status(400).json('Error getting user'))
});

// Get the list of members in the same team(centre)
app.get('/team-members/:team', (req, res) => {
    const { team } = req.params;

    // create an empty array to store team memebers
    let teamMembers = [];

    // determine who is in the team, then add all the usernames into the teamMembers array
    db.select('*').from('users')
        .where({
            team: team
        })
        .orderBy('username', 'asc')
        .then(users => {
            if (users.length) {
                users.forEach(user => teamMembers.push(user.username));
                res.json(teamMembers);
            } else {
                res.status(400).json(`No members found in team ${team}`);
            }
        })
        .catch(err => res.status(400).json('Error getting team members'))
});

// Get the total task count currently assigned to the team(centre), excluding tasks with status 'Done'
app.get('/teamTaskCount/:team', (req, res) => {
	const { team } = req.params;
	
	db.select('*').from('tasks')
		.where({
			centre: team
		})
		.andWhere('status', '<>', 'Done')
		.then(occurance => {
			res.json(occurance.length);
		})
		.catch(err => {
			res.status(500).json('An error occurred while fetching the total task count');
		})
});

// Get the list of tasks assigned to the team(centre), excluding tasks with status 'Done'
app.get('/teamAllTasks/:team', (req, res) => {
    const { team } = req.params;

    db.select('*').from('tasks')
		.where({
			centre: team
		})
		.andWhere('status', '<>', 'Done')
        .orderBy('deadline', 'asc')
		.then(data => {
			res.json(data);
		})
		.catch(err => {
			res.status(500).json('An error occurred while fetching the task data');
		})
});


app.listen(3001, ()=> {
    console.log('app is running on port 3001!');
});