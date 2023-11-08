// Get the total count of tasks assigned to a user that are not in 'Done' status.

const getTaskCount = (req, res, db) => {
    const { username } = req.params;

    // Validate the username to ensure it is not empty or undefined
    if (!username) {
        return res.status(400).json({ error: "Username is required" });
    }

    db.select('*').from('tasks')
        .where({ username: username })
        .andWhere('status', '<>', 'Done')
        .then(occurance => {
            res.json(occurance.length);
        })
        .catch(err => {
            console.error("Error fetching tasks:", err);
            res.status(500).json({ error: 'An unexpected error occurred while fetching the task count' });
        });
}

export default getTaskCount;
