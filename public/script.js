window.addEventListener('DOMContentLoaded', (event) => {
    function formatTime(seconds) {
        const min = Math.floor(seconds / 60);
        const sec = seconds % 60;
        return `${min.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
    }

    function fetchDataAndDisplay() {
        fetch('/getDisplayRound')
            .then(response => {
                if (!response.ok) {
                    throw new Error('Could not retrieve display round');
                }
                return response.json();
            })
            .then(data => {
                const displayRound = Number(data.displayRound);
                document.getElementById('currentRound').innerText = `Current Round: ${displayRound}`;

                fetch('/getData')
                    .then(response => {
                        if (!response.ok) {
                            throw new Error('Could not retrieve data');
                        }
                        return response.json();
                    })
                    .then(data => {
                        const tableBody = document.getElementById('leaderboard').getElementsByTagName('tbody')[0];
                        tableBody.innerHTML = "";

                        const teams = data.teams.filter(team => team.round === displayRound);
                        teams.sort((a, b) => a.finalTime - b.finalTime);

                        teams.forEach((team, index) => {
                            let newRow = tableBody.insertRow();
                            newRow.innerHTML = `
                                <td>${index + 1}</td>
                                <td>${team.name}</td>
                                <td>${formatTime(team.timeBeforePenalties)}</td>
                                <td>${formatTime(team.finalTime)}</td>
                            `;
                        });
                    })
                    .catch((error) => {
                        console.error('Error:', error);
                    });
            })
            .catch((error) => {
                console.error('Error:', error);
            });
    }

    fetchDataAndDisplay();

    const socket = io();

    socket.on('updateLeaderboard', (newTeam) => {
        console.log('Leaderboard updated:', newTeam);
        fetchDataAndDisplay();

        setTimeout(() => {
            const rows = document.querySelectorAll('#leaderboard tbody tr');
            rows.forEach((row) => {
                if (row.cells[1].textContent === newTeam.name) {
                    row.classList.add('new-entry');
                    setTimeout(() => {
                        row.classList.remove('new-entry');
                    }, 2000);
                }
            });
        }, 100);
    });

    socket.on('updateDisplayRound', (displayRound) => {
        console.log('Display round updated:', displayRound);
        fetchDataAndDisplay();
    });

    socket.on('teamDeleted', (teamId) => {
        console.log('Team deleted:', teamId);
        fetchDataAndDisplay();
    });
});
