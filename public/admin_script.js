window.addEventListener('DOMContentLoaded', (event) => {
    function toSeconds(time) {
        const [minutes, seconds] = time.split(':').map(Number);
        return (minutes * 60) + seconds;
    }

    function formatTime(seconds) {
        const min = Math.floor(seconds / 60);
        const sec = seconds % 60;
        return `${min.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
    }

    function updateDisplayRound() {
        fetch('/getDisplayRound')
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok' + response.statusText);
            }
            return response.json();
        })
        .then(data => {
            document.getElementById('currentDisplayRound').innerText = `Current Display Round: ${data.displayRound}`;
        })
        .catch((error) => {
            console.error('Failed to fetch display round:', error);
        });
    }

    function fetchAndDisplayData() {
        fetch('/getData')
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok' + response.statusText);
            }
            return response.json();
        })
        .then(data => {
            const maxRound = Math.max(...data.teams.map(team => team.round));
            const tabsContainer = document.getElementById('roundTabs');
            tabsContainer.innerHTML = "";
            for (let i = 1; i <= maxRound; i++) {
                const tab = document.createElement('button');
                tab.innerText = `Round ${i}`;
                tab.addEventListener('click', () => displayDataForRound(i, data.teams));
                tabsContainer.appendChild(tab);
            }
            displayDataForRound(1, data.teams);
        })
        .catch((error) => {
            console.error('Failed to fetch data:', error);
        });
    }

    function displayDataForRound(round, teams) {
        const tableBody = document.getElementById('adminLeaderboard').getElementsByTagName('tbody')[0];
        tableBody.innerHTML = "";
   
        const filteredTeams = teams.filter(team => team.round === round);
        filteredTeams.sort((a, b) => a.finalTime - b.finalTime);
            
        filteredTeams.forEach((team) => {
            let newRow = tableBody.insertRow();
            newRow.innerHTML = `
                <td>${team.name}</td>
                <td>${team.round}</td>
                <td>${formatTime(team.timeBeforePenalties)}</td>
                <td>${formatTime(team.finalTime)}</td>
                <td><button class="deleteButton" data-id="${team._id}">Delete</button></td>
            `;
        });
        // Add event listeners to the delete buttons
 document.querySelectorAll('.deleteButton').forEach(button => {
    button.addEventListener('click', function(e) {
        const teamId = e.target.getAttribute('data-id');
        if(confirm('Are you sure you want to delete this entry?')) {
            deleteTeam(teamId);
        }
    });
});

    }
   
    updateDisplayRound();
    fetchAndDisplayData();

    document.getElementById('adminForm').addEventListener('submit', function(e){
        e.preventDefault();
    
        const round = document.getElementById('round').value;
        const userId = document.getElementById('userId').value;
        const timeBeforePenalties = document.getElementById('timeBeforePenalties').value;
        
        // Fetch issues count from the form
        const missingOysters = parseInt(document.getElementById('missingOysters').value, 10);
        const notPlacedProperly = parseInt(document.getElementById('notPlacedProperly').value, 10);
        const brokenShell = parseInt(document.getElementById('brokenShell').value, 10);
        const gritBloodOther = parseInt(document.getElementById('gritBloodOther').value, 10);
        const cutOysters = parseInt(document.getElementById('cutOysters').value, 10);
        const notSevered = parseInt(document.getElementById('notSevered').value, 10);
    
        const bonus = document.getElementById('bonus').value;
    
        const timeRegex = /^\d{2}:\d{2}$/;
        if (!timeRegex.test(timeBeforePenalties) || !timeRegex.test(bonus)) {
            alert('Please ensure all time inputs are in MM:SS format.');
            return;
        }
    
        const timeBeforePenaltiesSec = toSeconds(timeBeforePenalties);
        const bonusSec = toSeconds(bonus);
    
        // Calculate penalties based on issues
        const penaltySeconds = (missingOysters * 20) + 
                               (notPlacedProperly * 2) +
                               (brokenShell * 1) +
                               (gritBloodOther * 3) +
                               (cutOysters * 3) +
                               (notSevered * 3);
        
        // Calculate the final time
        const finalTime = timeBeforePenaltiesSec + penaltySeconds - bonusSec;
    
        // Create form data object
        const formData = {
            userId,
            finalTime,
            timeBeforePenalties: timeBeforePenaltiesSec,
            penalties: penaltySeconds,
            bonus: bonusSec,
            round: parseInt(round, 10),
            // Include the shucking issues for further reference/analysis
            shuckingIssues: {
                missingOysters,
                notPlacedProperly,
                brokenShell,
                gritBloodOther,
                cutOysters,
                notSevered
            }
        };
    
        // Send the data to the server
        fetch('/updateData', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        })
        .then(response => {
            if (!response.ok) {
                return Promise.reject('Failed to update data');
            }
            return response.text();
        })
        .then(data => {
            console.log('Success:', data);
            document.getElementById('adminForm').reset();
            fetchAndDisplayData();  // Refresh the data displayed in the table
        })
        .catch((error) => {
            console.error('Error:', error);
        });
    });
    
   
    function deleteTeam(teamId) {
        fetch('/deleteData', {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ id: teamId })
        })
        .then(response => {
            if (!response.ok) {
                return Promise.reject('Failed to delete data');
            }
            return response.text();
        })
        .then(data => {
            console.log('Success:', data);
            fetchAndDisplayData();  // Refresh the data displayed in the table
        })
        .catch((error) => {
            console.error('Error:', error);
        });
    }
    
    
    document.getElementById('roundForm').addEventListener('submit', function(e){
        e.preventDefault();

        const displayRound = document.getElementById('displayRound').value;

        fetch('/updateRound', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ displayRound })
        })
        .then(response => {
            if (!response.ok) {
                return Promise.reject('Failed to update round');
            }
            return response.text();
        })
        .then(data => {
            console.log('Success:', data);
            document.getElementById('roundForm').reset();
            updateDisplayRound();  // Refresh the displayed round after updating it
            fetchAndDisplayData();  // Refresh the data displayed in the table
        })
        .catch((error) => {
            console.error('Error:', error);
        });
    });

    function fetchAndDisplayContestants() {
        fetch('/api/contestants')
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok' + response.statusText);
            }
            return response.json();
        })
        .then(data => {
            const contestantsContainer = document.getElementById('contestantsContainer');
            contestantsContainer.innerHTML = "";
   
            data.contestants.forEach((contestant) => {
                let newDiv = document.createElement('div');
                newDiv.innerHTML = `
                    Name: ${contestant.name}, UserID: ${contestant.userId}
                    <button class="deleteContestantButton" data-id="${contestant._id}">Delete</button>
                `;
                contestantsContainer.appendChild(newDiv);
            });

            // Add event listeners to the delete buttons
            document.querySelectorAll('.deleteContestantButton').forEach(button => {
                button.addEventListener('click', function(e) {
                    const contestantId = e.target.getAttribute('data-id');
                    if(confirm('Are you sure you want to delete this contestant?')) {
                        deleteContestant(contestantId);
                    }
                });
            });
        })
        .catch((error) => {
            console.error('Failed to fetch contestants:', error);
        });
    }

    // Initial fetch and display of contestants
    fetchAndDisplayContestants();

    // Listen for form submission to add a new contestant
    document.getElementById('contestantForm').addEventListener('submit', function(e){
        e.preventDefault();

        const name = document.getElementById('contestantName').value;
        const userId = document.getElementById('userId').value;

        const formData = {
            name: name,
            userId: userId
        };

        fetch('/api/contestants', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        })
        .then(response => {
            if (!response.ok) {
                return Promise.reject('Failed to add contestant');
            }
            return response.text();
        })
        .then(data => {
            console.log('Success:', data);
            document.getElementById('contestantForm').reset();
            fetchAndDisplayContestants();  // Refresh the displayed contestants
        })
        .catch((error) => {
            console.error('Error:', error);
        });
    });

    // ... Your existing JavaScript ...

function fetchAndDisplayContestants() {
    fetch('/api/contestants')
    .then(response => {
        if (!response.ok) {
            throw new Error('Network response was not ok' + response.statusText);
        }
        return response.json();
    })
    .then(data => {
        const tableBody = document.getElementById('contestantsTable').getElementsByTagName('tbody')[0];
        tableBody.innerHTML = "";
   
        data.contestants.forEach((contestant) => {
            let newRow = tableBody.insertRow();
            newRow.innerHTML = `
                <td contenteditable="false">${contestant.name}</td>
                <td contenteditable="false">${contestant.userId}</td>
                <td>
                    <button class="editButton" data-id="${contestant._id}">Edit</button>
                    <button class="deleteButton" data-id="${contestant._id}">Delete</button>
                </td>
            `;
        });

        // Add event listeners to the edit and delete buttons
        document.querySelectorAll('.editButton').forEach(button => {
            button.addEventListener('click', function(e) {
                const contestantId = e.target.getAttribute('data-id');
                handleEditButtonClick(e.target, contestantId);
            });
        });
        
        document.querySelectorAll('.deleteButton').forEach(button => {
            button.addEventListener('click', function(e) {
                const contestantId = e.target.getAttribute('data-id');
                if(confirm('Are you sure you want to delete this contestant?')) {
                    deleteContestant(contestantId);
                }
            });
        });
    })
    .catch((error) => {
        console.error('Failed to fetch contestants:', error);
    });
}

function handleEditButtonClick(button, contestantId) {
    const row = button.parentElement.parentElement;
    const cells = Array.from(row.getElementsByTagName('td'));
    if(button.textContent === "Edit") {
        // Make the name and userId cells editable
        cells[0].contentEditable = "true";
        cells[1].contentEditable = "true";
        // Change the button to a "Submit" button
        button.textContent = "Submit";
    } else {
        // Submit the changes
        const updatedName = cells[0].textContent;
        const updatedUserId = cells[1].textContent;
        updateContestant(contestantId, updatedName, updatedUserId);
        // Make the cells non-editable again
        cells[0].contentEditable = "false";
        cells[1].contentEditable = "false";
        // Change the button back to an "Edit" button
        button.textContent = "Edit";
    }
}

function updateContestant(id, name, userId) {
    fetch('/api/contestants', {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id, name, userId }),
    })
    .then(response => {
        if (!response.ok) {
            return Promise.reject('Failed to update contestant');
        }
        return response.text();
    })
    .then(data => {
        console.log('Success:', data);
        fetchAndDisplayContestants();  // Refresh the displayed contestants
    })
    .catch((error) => {
        console.error('Error:', error);
    });
}


// ... Your existing JavaScript ...

    // Function to delete a contestant
    function deleteContestant(contestantId) {
        fetch('/api/contestants', {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ id: contestantId })
        })
        .then(response => {
            if (!response.ok) {
                return Promise.reject('Failed to delete contestant');
            }
            return response.text();
        })
        .then(data => {
            console.log('Success:', data);
            fetchAndDisplayContestants();  // Refresh the displayed contestants
        })
        .catch((error) => {
            console.error('Error:', error);
        });
    }
});
