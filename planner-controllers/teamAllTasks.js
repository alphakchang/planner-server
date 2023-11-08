// Get the list of tasks assigned to the team(centre) that are not in 'Done' status.

const getTeamAllTasks = (req, res, db) => {
    const { team } = req.params;

    // Validate the username to ensure it is not empty or undefined
    if (!team) {
        return res.status(400).json({ error: "Team(Centre) is required" });
    }

    db.select('*').from('tasks')
		.where({ centre: team })
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

export default getTeamAllTasks;