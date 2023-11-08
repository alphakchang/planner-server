// Unassign a task based on the provided task_id

const handleUnclaim = (req, res, db) => {
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
}

export default handleUnclaim;