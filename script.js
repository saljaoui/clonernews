let currentOffset = 0
let postIds = []
const ITEMS_PER_PAGE = 20
let postStoryIds = []
let postJobIds = []
let postPollIds = []
let selectedType = 'stories'

// Debounce function to limit API calls
function debounce(func, wait) {
    let timeout
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout)
            func(...args)
        }
        clearTimeout(timeout)
        timeout = setTimeout(later, wait)
    }
}

async function fetchItems(type) {
    const response = await fetch(`https://hacker-news.firebaseio.com/v0/${type}.json`)
    return await response.json()
}

async function fetchItemDetails(itemId) {
    const response = await fetch(`https://hacker-news.firebaseio.com/v0/item/${itemId}.json`)
    return await response.json()
}
async function loadPosts(type) {
    const loadingElement = document.getElementById('loading');
    loadingElement.style.display = 'block';

    try {
        if (postIds.length === 0) {
            const storyIds = await fetchItems('newstories');
            const jobIds = await fetchItems('jobstories');
            const pollIds = await fetchItems('topstories');
            postIds = [...storyIds, ...jobIds, ...pollIds].sort((a, b) => b - a);
            postStoryIds = [...storyIds];
            postJobIds = [...jobIds];
            postPollIds = [...pollIds];
        }

        let idsToDisplay = [];
        switch (type) {
            case 'newstories':
                idsToDisplay = postStoryIds;
                break;
            case 'jobstories':
                idsToDisplay = postJobIds;
                break;
            case 'topstories':
                idsToDisplay = postPollIds;
                break;
        }

        const newPosts = await Promise.all(
            idsToDisplay.slice(currentOffset, currentOffset + ITEMS_PER_PAGE).map(fetchItemDetails)
        );

        displayPosts(newPosts);
        currentOffset += ITEMS_PER_PAGE;

        if (currentOffset >= idsToDisplay.length) {
            document.getElementById('load-more').style.display = 'none';
        }
    } catch (error) {
        console.error('Error loading posts:', error);
    } finally {
        loadingElement.style.display = 'none';
    }
}
document.getElementById('post-type').addEventListener('change', (event) => {
    selectedType = event.target.value;
    currentOffset = 0;
    document.getElementById('feed').innerHTML = '';
    loadPosts(selectedType);
});

async function loadComments(postId) {
    const post = await fetchItemDetails(postId)
    if (post.kids) {
        const comments = await Promise.all(post.kids.map(fetchItemDetails))
        return comments
    }
    return []
}

function displayPosts(posts) {
    const feed = document.getElementById('feed')
    posts.forEach(post => {
        if (post) {
            const postElement = document.createElement('div')
            postElement.classList.add('post')
            postElement.innerHTML = `
                <h3>${post.title || post.text || 'No Title'} (${post.type || 'Unknown Type'})</h3>
                <p>by ${post.by || 'Unknown'} | Score: ${post.score || 0} | Comments: ${post.descendants || 0}</p>
                ${post.url ? `<a href="${post.url}" target="_blank" rel="noopener noreferrer">Read more</a>` : ''}
                <button onclick="toggleComments(${post.id}, this)">Show Comments</button>
                <div id="comments-${post.id}" style="display: none"></div>
            `
            feed.appendChild(postElement)
        }
    })
}

async function toggleComments(postId, button) {
    const commentsContainer = document.getElementById(`comments-${postId}`)
    if (commentsContainer.style.display === 'none') {
        commentsContainer.style.display = 'block'
        button.textContent = 'Hide Comments'
        const comments = await loadComments(postId)
        displayComments(comments, commentsContainer)
    } else {
        commentsContainer.style.display = 'none'
        button.textContent = 'Show Comments'
    }
}

function displayComments(comments, container) {
    container.innerHTML = ''
    comments.forEach(comment => {
        if (comment && !comment.deleted) {
            const commentElement = document.createElement('div')
            commentElement.classList.add('comment')
            commentElement.innerHTML = `
                <p>${comment.by || 'Unknown'}: ${comment.text || 'No content'}</p>
            `
            container.appendChild(commentElement)
        }
    })
}

async function updateLiveData() {
    const liveDataContainer = document.getElementById('live-data')
    const latestItemId = await fetchItems('maxitem')
    const latestItem = await fetchItemDetails(latestItemId)
    
    liveDataContainer.innerHTML = `
        <h2>Latest Update</h2>
        <p>${latestItem.title || latestItem.text || 'No content'}</p>
        <p>Type: ${latestItem.type}, by ${latestItem.by || 'Unknown'}</p>
    `
}

// Initial load
loadPosts()
updateLiveData()

// Set up event listeners
document.getElementById('load-more').addEventListener('click', debounce(loadPosts, 300))

// Live data updates
setInterval(updateLiveData, 5000)