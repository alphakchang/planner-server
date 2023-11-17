// Prototype feature - Add a new task to the database

const handleAddTask = (req, res, db) => {

    const { username, centre, task_name, locale, required_hours, deadline, status, job_number, task_number } = req.body;

    // Parse the deadline from the format 'DD-MM-YYYY HH:MM' to a Date object
    const parts = deadline.match(/(\d{2})-(\d{2})-(\d{4}) (\d{2}):(\d{2})/);
    const formattedDeadline = new Date(parts[3], parts[2] - 1, parts[1], parts[4], parts[5]).toISOString();

    // Convert to the local timezone and strip the 'T' and milliseconds from the ISO string
    const deadlineForDb = formattedDeadline.replace('T', ' ').slice(0, 19);

    db('tasks')
        .insert({
            username,
            centre,
            task_name,
            locale,
            required_hours,
            deadline: formattedDeadline,
            status,
            job_number,
            task_number
        })
        .then(taskId => {
            res.json({ task_id: taskId[0] });
        })
        .catch(err => {
            console.error(err);
            res.status(500).json('Unable to add task');
        });

}

export default handleAddTask;