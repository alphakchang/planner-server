// Mark a task status as Done

const handleMarkDone = (req, res, db) => {
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
}

export default handleMarkDone;