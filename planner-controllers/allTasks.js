// Get the list of tasks assigned to the user that are not in 'Done' status.

const getAllTasks = (req, res, db) => {
    const { username } = req.params;

    // Validate the username to ensure it is not empty or undefined
    if (!username) {
        return res.status(400).json({ error: "Username is required" });
    }

    db.select('*').from('tasks')
		.where({ username: username })
		.andWhere('status', '<>', 'Done')
        .orderBy('deadline', 'asc')
		.then(data => {
			res.json(data);
		})
		.catch(err => {
            console.error("Error fetching tasks:", err);
            res.status(500).json({ error: 'An unexpected error occurred while fetching the task data' });
        });
}

export default getAllTasks;