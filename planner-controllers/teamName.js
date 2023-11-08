// Get the user's team-name(centre), based on the provided username

const getTeamName = (req, res, db) => {
    const { username } = req.params;
	
    db.select('*').from('users')
        .where({ username: username })
        .then(users => {
            if (users.length) {
                res.json(users[0].team);
            } else {
                res.status(404).json('User not found'); // HTTP status code 404 for "Not Found"
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

export default getTeamName;