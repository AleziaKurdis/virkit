//
//  openVote.js
//
//  Created by Alezia Kurdis, October 20th, 2025.
//  Copyright 2025 Overte e.V.
//
//  javascript for the HTML ui of the openVote application. 
//  Ui for the voting application openVote.
//
//  Distributed under the Apache License, Version 2.0.
//  See the accompanying file LICENSE or http://www.apache.org/licenses/LICENSE-2.0.html
//

const channel = "overte.application.more.openVote";
let openVote = {
    "voters": [],
    "polls": [],
    "sessionUUID": "",
    "isAnonymous": true
};

let activeTab = "VOTERS";

let votePanel = [];

function listener(message) {
    let messageObj;
    try {
        messageObj = JSON.parse(message);
    } catch (e) {
        console.warn("Failed to parse message:", message);
        return;
    }
    if (messageObj.channel === channel) {
        if (messageObj.action === "updateData") {
            openVote.voters = messageObj.data.voters || [];
            openVote.polls = messageObj.data.polls || [];
            openVote.sessionUUID = messageObj.data.sessionUUID;
            openVote.isAnonymous = messageObj.data.isAnonymous;
            displayData();
        }
    }
}

EventBridge.scriptEventReceived.connect(listener);

const votersTab = document.getElementById("votersTab");
const pollsTab = document.getElementById("pollsTab");
const voterList = document.getElementById("voterList");
const pollList = document.getElementById("pollList");
const pollsContainer = document.getElementById("pollsContainer");
const createPoll = document.getElementById("createPoll");
const addPollBtn = document.getElementById("addPollBtn");
const createPollCreateBtn = document.getElementById("createPollCreateBtn");
const createPollCancelBtn = document.getElementById("createPollCancelBtn");
const createPollQuestion = document.getElementById("question");
const createPollChoices = document.querySelectorAll('.choices');
const createPollIsPreferential = document.getElementById("isPreferential");
const createPollAllowAnonymous = document.getElementById("allowAnonymous");
const createPollIsSecretVote = document.getElementById("isSecretVote");
const createPollErrorMessage = document.getElementById("errorMessage");
const createPollDuration = document.getElementById("duration");
const votationPanel = document.getElementById("votationPanel");

votersTab.addEventListener("click", function () {
    manageTabsDisplay(votersTab);
    displayVoters();
});

pollsTab.addEventListener("click", function () {
    manageTabsDisplay(pollsTab);
    displayPolls();
});

addPollBtn.addEventListener("click", function () {
    displayCreatePoll();
});

createPollCreateBtn.addEventListener("click", function () {
    //Collect and save the poll
    if (createPollQuestion.value === "") {
        createPollErrorMessage.innerHTML = "&#9888; A poll requires a Question.";
        return;
    }
    const choices = Array.from(createPollChoices).map(input => input.value.trim()).filter(value => value !== '');
    if (choices.length < 2) {
        createPollErrorMessage.innerHTML = "&#9888; A poll requires at least 2 choices.";
        return;
    } else if (hasDuplicates(choices)) {
        createPollErrorMessage.innerHTML = "&#9888; You must not have identical choices.";
        return;
    }
    
    if (createPollDuration.value === "") {
        createPollErrorMessage.innerHTML = "&#9888; You need to set a vote duration.";
        return;
    }
    const duration = parseInt(createPollDuration.value, 10);
    if (duration < 1 || isNaN(duration)) {
        createPollErrorMessage.innerHTML = "&#9888; Vote duration must be valid and greater than 0.";
        return;
    }
    
    const messageToSend = {
        "channel": channel,
        "action": "Create_Poll",
        "question": createPollQuestion.value,
        "choices": choices,
        "isPreferential": createPollIsPreferential.checked,
        "allowAnonymous": createPollAllowAnonymous.checked,
        "isSecretVote": createPollIsSecretVote.checked,
        "duration": duration
    };
    EventBridge.emitWebEvent(JSON.stringify(messageToSend));
    
    resetPollForm();
    displayPolls();
});

function hasDuplicates(arr) {
    return new Set(arr).size !== arr.length;
}

createPollCancelBtn.addEventListener("click", function () {
    resetPollForm();
    displayPolls();
});

function resetPollForm() {
    createPollQuestion.value = "";
    createPollChoices.forEach(input => input.value = "");
    createPollIsPreferential.checked = false;
    createPollAllowAnonymous.checked = false;
    createPollIsSecretVote.checked = true;
    createPollDuration.value = 10;
    createPollErrorMessage.innerHTML = "&nbsp;";
}

function manageTabsDisplay(obj) {
    votersTab.className = "tab";
    pollsTab.className = "tab";
    obj.className = "tabActive";
}

function displayVoters() {
    createPoll.style.display = "none";
    pollList.style.display = "none";
    voterList.style.display = "block";
    activeTab = "VOTERS";
    displayData();
}

function displayPolls() {
    createPoll.style.display = "none";
    voterList.style.display = "none";
    pollList.style.display = "block";
    activeTab = "POLLS";
    displayData();
}

function displayCreatePoll() {
    voterList.style.display = "none";
    pollList.style.display = "none";
    createPoll.style.display = "block";
    activeTab = "CREATEPOLL";
}

function announcePoll(id) {
    const messageToSend = {
        "channel": channel,
        "action": "announce_Poll",
        "id": id
    };
    EventBridge.emitWebEvent(JSON.stringify(messageToSend));
}

function openPoll(id) {
    const messageToSend = {
        "channel": channel,
        "action": "open_Poll",
        "id": id
    };
    EventBridge.emitWebEvent(JSON.stringify(messageToSend));
}

function closePoll(id) {
    const messageToSend = {
        "channel": channel,
        "action": "close_Poll",
        "id": id
    };
    EventBridge.emitWebEvent(JSON.stringify(messageToSend));
}

function deletePoll(id) {
    const messageToSend = {
        "channel": channel,
        "action": "delete_Poll",
        "id": id
    };
    EventBridge.emitWebEvent(JSON.stringify(messageToSend));
}

function getPollIndexFromId(id) {
    let index = null;
    for (let i = 0; i < openVote.polls.length; i++) {
        if (openVote.polls[i].id === id) {
            index = i;
            break;
        }
    }
    return index;
}

function votePoll(id) {
    const pollID = getPollIndexFromId(id);
    let myVote;
    if (openVote.polls[pollID].isPreferential) {
        const checkboxes = document.querySelectorAll('input[name="vote"]:checked');
        myVote = Array.from(checkboxes).map(cb => Number(cb.value));
    } else {
        const selected = document.querySelector('input[name="vote"]:checked');
        const voteIndex = selected ? Number(selected.value) : null;
        if (voteIndex !== null) {
            myVote = [voteIndex];
        } else {
            myVote = [];
        }
    }
    const messageToSend = {
        "channel": channel,
        "action": "voting",
        "pollID": id,
        "sessionUUID": openVote.sessionUUID,
        "vote": myVote
    };
    EventBridge.emitWebEvent(JSON.stringify(messageToSend));
    closeVotationPanel();
}

function closeVotationPanel() {
    votationPanel.style.transform = "translateX(-100%)";
}

function getAnnonymousName(id) {
    return "Anonymous " + id.substring(1, 6);
}

function formatTime(ms) {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (hours > 0) {
        return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    } else {
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }
}

function getCurrentVote(pollIndex, sessionUUID) {
    let currentVote = {
        "vote": [],
        "hasVoted": true,
        "isVoter": false
    };
    for (let i = 0; i < openVote.polls[pollIndex].results.length; i++) {
        if (openVote.polls[pollIndex].results[i].sessionUUID === sessionUUID) {
            currentVote = {
                "vote": openVote.polls[pollIndex].results[i].vote,
                "hasVoted": openVote.polls[pollIndex].results[i].hasVoted,
                "isVoter": true
            };
            break;
        }
    }
    return currentVote;
}

function setVotePanel(pollIndex) {
    votationPanel.style.transform = "translateX(0%)";
    votationPanel.innerHTML = votePanel[pollIndex];
}

function displayData() {
    let content = "";
    if (activeTab === "VOTERS") {
        if (openVote.voters.length === 0) {
            return;
        }
        let anonymousMarker;
        let username;
        for (let i = 0; i < openVote.voters.length; i++) {
            if (!openVote.voters[i].isAnonymous) {
                anonymousMarker = "<span class='voterEntryMarker'>&#128979;</span>";
                username = openVote.voters[i].username + " ";
            } else {
                anonymousMarker = "";
                username = "";
            }
            let name = openVote.voters[i].displayName ? openVote.voters[i].displayName : username;
            if (name === "") {
                name = getAnnonymousName(openVote.voters[i].sessionUUID);
            }
            content += '<div class="voterEntryContainer">';
            content += "<span class='voterEntryName'>" + name + "</span> " + anonymousMarker + "<br>";
            content += "<span class='voterEntryDetails'>" + username + openVote.voters[i].sessionUUID + "</span>";
            content += '</div>';
        }
        voterList.innerHTML = content;
    } else if (activeTab === "POLLS") {
        let skipped, actions, canVote, statusClass;
        for (let i = 0; i < openVote.polls.length; i++) {
            skipped = false;
            canVote = true
            actions = [];
            statusClass = " " + openVote.polls[i].state;
            switch(openVote.polls[i].state) {
                case "DRAFT":
                    if (openVote.polls[i].owner !== openVote.sessionUUID) {
                        skipped = true;
                    } else {
                        actions = ["Announce", "Delete"];
                    }
                    canVote = false;
                    break;
                case "PENDING":
                    if (openVote.polls[i].owner === openVote.sessionUUID) {
                        actions = ["Open vote", "Delete"];
                    }
                    canVote = false;
                    break;
                case "OPEN":
                    if (openVote.polls[i].owner === openVote.sessionUUID) {
                        actions = ["Close vote"];
                    }
                    if (openVote.isAnonymous && !openVote.polls[i].allowAnonymous) {
                        canVote = false;
                    }
                    break;
                case "CLOSED":
                    canVote = false;
                    break;
                case "DELETED":
                    skipped = true;
                    break;
                default:
                    alert("Error, the 'state' is not recognized.");
                    skipped = true;
            } 

            if (!skipped) {
                
                let secret = "SECRET VOTE";
                if (!openVote.polls[i].isSecretVote) {
                    secret = "OPEN VOTE";
                }
                
                let preferential = "SINGLE";
                if (openVote.polls[i].isPreferential) {
                    preferential = "MULTIPLE";
                }
                
                content += '<div class="pollEntryContainer' + statusClass + '">';
                content += '<table style="width: 100%;  border-collapse: collapse;"><tr>';
                content += "<td class='tdPollState'><span class='pollsState" + statusClass + "'>" + openVote.polls[i].state + "</span></td>";
                content += "<td class='tdPollState'><span class='pollsState'>" + secret + "</span></td>";
                content += "<td class='tdPollState'><span class='pollsState'>" + preferential + "</span></td>";
                content += "<td class='tdPollState'><span class='pollsState'>" + openVote.polls[i].duration + " min.</span></td>";
                let isAno = openVote.polls[i].allowAnonymous ? "ALL" : "LOGGED-IN";
                content += "<td class='tdPollState'><span class='pollsState'>" + isAno + "</span></td>";
                content += '</tr></table><hr>';
                content += "<span class='pollsQuestion'>" + openVote.polls[i].question + "</span><br><br>";
                
                //Choices
                if (canVote) {
                    const yourVote = getCurrentVote(i, openVote.sessionUUID);
                    if (yourVote.isVoter) {
                        if (!yourVote.hasVoted) {
                            votePanel[i] = "";
                            votePanel[i] += '<br><br><span class="pollsQuestion inPanel">' + openVote.polls[i].question + '</span><br><br>';
                            //here we can vote
                            openVote.polls[i].choices.forEach((value, index) => {
                                if (openVote.polls[i].isPreferential) {
                                    votePanel[i] += '<label><input type="checkbox" name="vote" value="' + index + '"> ' + value + '</label><br>';
                                } else {
                                    votePanel[i] += '<label><input type="radio" name="vote" value="' + index + '"> ' + value + '</label><br>';
                                }
                            });
                            //vote button here
                            votePanel[i] += '<br><br><div class="centeredButton">';
                            votePanel[i] += '<button class="base voting" id="votingPollBtn" onClick="votePoll(' + "'" + openVote.polls[i].id + "'" + ');">Vote</button>';
                            votePanel[i] += '<button class="base" id="cancelVotingPollBtn" onClick="closeVotationPanel();">Cancel</button>';
                            votePanel[i] += '</div>';
                            openVote.polls[i].choices.forEach((value, index) => {
                                content += "<span class='pollsChoices'>&nbsp;&nbsp;" + value + "</span><br>";
                            });
                            content += '<div class="centeredButton"><button class="base voting" id="openVote" onClick="setVotePanel(' + i + ');">Vote</button></div>';
                            
                        } else {
                            //Already voted, we display the selected vote
                            openVote.polls[i].choices.forEach((value, index) => {
                                if (yourVote.vote.indexOf(index) !== -1) {
                                    content += "<span class='pollsChoices highlighted'>&#9745;&nbsp;&nbsp;" + value + "</span><br>";
                                } else {
                                    content += "<span class='pollsChoices'>&#9744;&nbsp;&nbsp;" + value + "</span><br>";
                                }
                            });
                        }
                    } else {
                        //Note on the list of voters for this poll
                        openVote.polls[i].choices.forEach((value, index) => {
                            content += "<span class='pollsChoices'>&nbsp;&nbsp;" + value + "</span><br>";
                        });
                    }
                } else {
                    if (openVote.polls[i].state === "CLOSED") {
                        //display result
                        const statistic = getStat(openVote.polls[i].results, openVote.polls[i].choices, openVote.polls[i].isPreferential);
                        //content += JSON.stringify(statistic) + "<br>";//################## TEMPORARY
                        let highlight, score;
                        let d = new Date();
                        let n = d.getTime();
                        content += "<table>";
                        openVote.polls[i].choices.forEach((value, index) => {
                            highlight = "";
                            theWinner = "";
                            if (statistic.winner === index) {
                                highlight = " highlighted";
                            }
                            score = statistic.score[index];
                            if (statistic.arePercent) {
                                score = expressInPercent(score);
                            }
                            content += "<tr><td><span class='pollsChoices" + highlight + "'>&nbsp;&nbsp;" + value + "</td><td><span class='pollsChoices" + highlight + "'>&nbsp;&nbsp;" + score + "</span></td>";
                            if (!openVote.polls[i].isSecretVote) {
                                let uniqueId = "voters" + i + "_" + index + "_" + n;
                                content += "<td>&nbsp;&nbsp;<a href='#' class='toggleVoterslist' onclick='toggleDiv(" + '"' + uniqueId + '"' + "); return false;'>voters</a></td>";
                                content += "</tr><tr><td colspan = '3' ><div id='" + uniqueId + "' style='font-style: italic; font-size: 10px; display: none;'>" + statistic.voterList[index] + "</div><td>";
                            }
                            content += "</tr>";
                        });
                        content += "</table>";
                        content += "<hr><span class='resultDetails'>Participation: " + expressInPercent(statistic.participation) + " (" + statistic.totalVoted + "/" + openVote.polls[i].results.length + ")</span><br>";
                    } else {
                        //draft of pending, just display
                        openVote.polls[i].choices.forEach((value, index) => {
                            content += "<span class='pollsChoices'>&nbsp;&nbsp;" + value + "</span><br>";
                        });
                    }
                }
                
                if (openVote.polls[i].state === "OPEN") {
                    content += "<hr><div class='pollsRemainingTime'>Remaining time to vote: " + formatTime(openVote.polls[i].voteRemainingTime) + "</div>";
                }
                //Actions
                if (actions.length > 0) {
                    content += '<hr><div id="actionsContainer">';
                    if (actions.indexOf("Announce") !== -1) {
                        content += '<button class="base announce" id="announcePollBtn" onClick="announcePoll(' + "'" + openVote.polls[i].id + "'" + ');">Announce</button>';
                    }
                    if (actions.indexOf("Open vote") !== -1) {
                        content += '<button class="base open" id="openPollBtn" onClick="openPoll(' + "'" + openVote.polls[i].id + "'" + ');">Open vote</button>';
                    }
                    if (actions.indexOf("Close vote") !== -1) {
                        content += '<button class="base close" id="closePollBtn" onClick="closePoll(' + "'" + openVote.polls[i].id + "'" + ');">Close vote</button>';
                    }
                    if (actions.indexOf("Delete") !== -1) {
                        content += '<button class="base" id="deletePollBtn" onClick="deletePoll(' + "'" + openVote.polls[i].id + "'" + ');">Delete</button>';
                    }
                    content += '</div>';
                }
                
                content += '</div>';
            }
        }
        pollsContainer.innerHTML = content;
    }
}

function toggleDiv(id) {
    const div = document.getElementById(id);
    div.style.display = (div.style.display === "none") ? "block" : "none";
}

function expressInPercent(value) {
    return (value * 100).toFixed(1) + " %";
}

function getStat(result, choices, isMultiple) {
    let stat = {
        "score": [],
        "voterList": [],
        "arePercent": !isMultiple,
        "participation": 0,
        "totalVoted": 0,
        "winner": -1,
    };
    let votes = [];
    let voted = 0;
    const nbrRegisteredVoter  = result.length;
    if (nbrRegisteredVoter  < 1) {
        return stat;    
    }
    
    for (let i=0; i < nbrRegisteredVoter ; i++) {
        if (result[i].hasVoted) {
            voted++;
        }
        for (let k=0; k < result[i].vote.length; k++) {
            const v = result[i].vote[k];
            if (!stat.score[v]) {
                stat.score[v] = 0;
            }
            stat.score[v]++;
            if (!stat.voterList[v]) {
                stat.voterList[v] = "";
            }
            stat.voterList[v] = stat.voterList[v] + result[i].name + ", ";
        }
    }
    let winner = -1;
    let bestScore = 0;
    for (let v=0; v < choices.length; v++) {
        if (!stat.score[v]) {
            stat.score[v] = 0;
        }
        if (stat.score[v] > bestScore) {
            bestScore = stat.score[v];
            winner = v;
        } else {
            if (stat.score[v] === bestScore) {
                winner = -1;
            }
        }
        if (!isMultiple) {
            if (voted !== 0) {
                stat.score[v] = stat.score[v]/voted;
            } else {
                stat.score[v] = 0;
            }
        }
        if (!stat.voterList[v]) {
            stat.voterList[v] = "";
        } else {
            stat.voterList[v] = stat.voterList[v].slice(0, -2);
        }
    }

    stat.participation = voted/nbrRegisteredVoter ;
    stat.totalVoted = voted;
    stat.winner = winner;

    return stat;
}

document.addEventListener("DOMContentLoaded", displayData);

