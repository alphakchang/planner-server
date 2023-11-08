// Get the total count of tasks assigned to the team(centre) that are not in 'Done' status.

const getTeamTaskCount = (req, res, db) => {
    const { team } = req.params;

    // Validate the username to ensure it is not empty or undefined
    if (!team) {
        return res.status(400).json({ error: "Team(Centre) is required" });
    }
	
	db.select('*').from('tasks')
		.where({ centre: team })
		.andWhere('status', '<>', 'Done')
		.then(occurance => {
			res.json(occurance.length);
		})
		.catch(err => {
            console.error("Error fetching tasks:", err);
            res.status(500).json({ error: 'An unexpected error occurred while fetching the task count' });
        });
}

export default getTeamTaskCount;