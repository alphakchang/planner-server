// get the locale of the user, based on the provided username

const getLocale = (req, res, db) => {
    const { username } = req.params;
	
    db.select('*').from('users')
        .where({ username: username })
        .then(users => {
            if (users.length) {
                res.json(users[0].locale);
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
                res.status(500).json('An error occurred while retrieving the locale'); // Use HTTP status code 500 for "Internal Server Error"
            }
        });
}

export default getLocale;