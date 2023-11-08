// Get the task details based on the provided task_id

const getTask = (req, res, db) => {
    const { task_id } = req.params;

    db.select('*').from('tasks')
        .where({ task_id: task_id })
        .then(tasks => {
            if (tasks.length) {
                res.json(tasks[0]);
            } else {
                res.status(404).json('Task not found'); // HTTP status code 404 for "Not Found"
            }
        })
        .catch(err => {
            console.error('Error accessing the database:', err); // Log the detailed error to the console
            if (err.message.includes('timeout')) {
                res.status(408).json('Request timeout'); // HTTP status code 408 for "timeouts"
            } else {
                // Handle other types of errors generically
                res.status(500).json('An error occurred while retrieving the task'); // Use HTTP status code 500 for "Internal Server Error"
            }
        });
}

export default getTask;