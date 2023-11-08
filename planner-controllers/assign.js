// Assign a username to a task based on the provided task_id and username

const handleAssign = (req, res, db) => {
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
}

export default handleAssign;