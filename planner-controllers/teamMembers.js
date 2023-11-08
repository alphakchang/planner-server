// Get the list of members in the same team(centre), based on the provided team(centre)
// NOTE: Maybe change this endpoint to return users that match both the team and locale

const getTeamMembers = (req, res, db) => {
    const { team } = req.params;

    // create an empty array to store team memebers
    let teamMembers = [];

    // determine who is in the team, then add all the usernames into the teamMembers array
    db.select('*').from('users')
        .where({ team: team })
        .orderBy('username', 'asc')
        .then(users => {
            if (users.length) {
                users.forEach(user => teamMembers.push(user.username));
                res.json(teamMembers);
            } else {
                res.status(404).json(`No members found in team ${team}`); // HTTP status code 404 for "Not Found"
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

export default getTeamMembers;