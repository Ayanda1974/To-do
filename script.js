document.addEventListener('DOMContentLoaded', function() {
    const taskInput = document.getElementById('taskInput');
    const addBtn = document.getElementById('addBtn');
    const taskList = document.getElementById('taskList');

    // Add a new task
    addBtn.addEventListener('click', function() {
        if (taskInput.value.trim() === '') {
            alert('Please enter a task!');
            return;
        }

        const li = document.createElement('li');
        li.innerHTML = `
            <span>${taskInput.value}</span>
            <button class="deleteBtn">Delete</button>
        `;
        taskList.appendChild(li);
        taskInput.value = '';

        // Toggle completed task
        li.querySelector('span').addEventListener('click', function() {
            li.classList.toggle('completed');
        });

        // Delete task
        li.querySelector('.deleteBtn').addEventListener('click', function() {
            li.remove();
        });
    });

    // Allow adding tasks with "Enter" key
    taskInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            addBtn.click();
        }
    });
});