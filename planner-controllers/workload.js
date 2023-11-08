// Obtain the workload data, based on the provided username and requested dates, username in req.params, dates in req.body

const getWorkload = (req, res, db) => {
    const { username } = req.params;

    db.select('*').from('workload')
        .where({ username: username })
        .then(user => {
            if (user.length) {
				if (user[0][req.body.date]) {
					res.json(user[0][req.body.date])
				} else {
					res.json(0) // workload is 0 if the date is not in the database
				}
            } else {
                res.status(404).json(`Workload data not found for ${username}`); // HTTP status code 404 for "Not Found"
            }
        })
        .catch(err => {
            console.error('Error accessing the database:', err); // Log the detailed error to the console
            if (err.message.includes('timeout')) {
            res.status(408).json('Request timeout'); // HTTP status code 408 for "timeouts"
            } else {
            // Handle other types of errors generically
            res.status(500).json('An error occurred while retrieving the user'); // Use HTTP status code 500 for "Internal Server Error"
            }
        });
}

export default getWorkload;