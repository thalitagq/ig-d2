const express = require('express');
const cors = require('cors');

const { v4: uuidv4, validate, v4 } = require('uuid');

const app = express();
app.use(express.json());
app.use(cors());

const users = [];

function checksExistsUserAccount(request, response, next) {
  const { username } = request.headers;
  const user = users.find((user) => user.username === username);

  if (user) {
    request.user = user;
    next();
  }
  else {
    response.status(404).json({ error: "User not found" });
  }
}

function checksCreateTodosUserAvailability(request, response, next) {
  const { user } = request
  if (user.todos.length < 10 || user.pro) {
    request.user = user
    next()
  }
  else {
    response.status(403).json({ error: "User has already filled the amount of todos available." })
  } 
}

function checksTodoExists(request, response, next) {
  const { username } = request.headers
  const { id } = request.params
  const user = users.find(u => u.username === username)
  if(!users.some(user => user.username === username)){
    response.status(404).json({error: "User not found"})
  }
  else if (!validate(id)){
    response.status(400).json({erro: "Todo id not valid"})
  }
  else if (!user.todos.some(todo => todo.id === id)){
    response.status(404).json({error: "Todo id not found for this user"})
  }
  else{
    request.user = user
    request.todo = user.todos.filter(todo => todo.id === id)[0]
    next()
  }
}

function findUserById(request, response, next) {
  const user = users.filter(user => user.id === request.params.id)[0]
  if(user){
    request.user = user
    next()
  }
  response.status(404).json({error: "User not found."})
}

app.post('/users', (request, response) => {
  const { name, username } = request.body;

  const usernameAlreadyExists = users.some((user) => user.username === username);

  if (usernameAlreadyExists) {
    return response.status(400).json({ error: 'Username already exists' });
  }

  const user = {
    id: uuidv4(),
    name,
    username,
    pro: false,
    todos: []
  };

  users.push(user);

  return response.status(201).json(user);
});

app.get('/users/:id', findUserById, (request, response) => {
  const { user } = request;

  return response.json(user);
});

app.patch('/users/:id/pro', findUserById, (request, response) => {
  const { user } = request;

  if (user.pro) {
    return response.status(400).json({ error: 'Pro plan is already activated.' });
  }

  user.pro = true;

  return response.json(user);
});

app.get('/todos', checksExistsUserAccount, (request, response) => {
  const { user } = request;

  return response.json(user.todos);
});

app.post('/todos', checksExistsUserAccount, checksCreateTodosUserAvailability, (request, response) => {
  const { title, deadline } = request.body;
  const { user } = request;

  const newTodo = {
    id: uuidv4(),
    title,
    deadline: new Date(deadline),
    done: false,
    created_at: new Date()
  };

  user.todos.push(newTodo);

  return response.status(201).json(newTodo);
});

app.put('/todos/:id', checksTodoExists, (request, response) => {
  const { title, deadline } = request.body;
  const { todo } = request;

  todo.title = title;
  todo.deadline = new Date(deadline);

  return response.json(todo);
});

app.patch('/todos/:id/done', checksTodoExists, (request, response) => {
  const { todo } = request;

  todo.done = true;

  return response.json(todo);
});

app.delete('/todos/:id', checksExistsUserAccount, checksTodoExists, (request, response) => {
  const { user, todo } = request;

  const todoIndex = user.todos.indexOf(todo);

  if (todoIndex === -1) {
    return response.status(404).json({ error: 'Todo not found' });
  }

  user.todos.splice(todoIndex, 1);

  return response.status(204).json();
});

module.exports = {
  app,
  users,
  checksExistsUserAccount,
  checksCreateTodosUserAvailability,
  checksTodoExists,
  findUserById
};