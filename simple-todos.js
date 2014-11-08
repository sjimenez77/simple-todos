/* Cloud9 config warnings */
/* global Tasks Mongo Meteor Session Template TAPi18n Accounts Tracker */

// simple-todos.js
Tasks = new Mongo.Collection('tasks');

if (Meteor.isClient) {
  Meteor.subscribe("tasks");

  // Replace the existing Template.body.helpers
  Template.body.helpers({
    tasks: function () {
      if (Session.get("hideCompleted")) {
        // If hide completed is checked, filter tasks
        return Tasks.find({checked: {$ne: true}}, {sort: {createdAt: -1}});
      } else {
        // Otherwise, return all of the tasks
        return Tasks.find({}, {sort: {createdAt: -1}});
      }
    },
    hideCompleted: function () {
      return Session.get("hideCompleted");
    },
    // Add to Template.body.helpers
    incompleteCount: function () {
      return Tasks.find({checked: {$ne: true}}).count();
    },
    // Current language ES
    esLang: function () {
      if (Session.get("language") === "es") return "selected";
    },
    // Current language EN
    enLang: function () {
      if (Session.get("language") === "en") return "selected";
    }
  });

  // In the client code, right after Template.body.helpers:
  Template.body.events({
    "submit .new-task": function (event) {
      // This function is called when the new task form is submitted

      var text = event.target.text.value;

      // replace Tasks.insert( ... ) with method call:
      Meteor.call("addTask", text);

      // Clear form
      event.target.text.value = "";

      // Prevent default form submit
      return false;
    },
    // Add to Template.body.events
    "change .hide-completed input": function (event) {
      Session.set("hideCompleted", event.target.checked);
    },
    // Change language
    "change .language select": function (event) {
      var newLanguage = event.target.value;
      Session.set("language", newLanguage);
      TAPi18n.setLanguage(newLanguage);
      Meteor.call("setUserLanguage", newLanguage);
    }
  });

  // Define a helper to check if the current user is the task owner
  Template.task.helpers({
    isOwner: function () {
      return this.owner === Meteor.userId();
    }
  });

  // In the client code, below everything else
  Template.task.events({
    "click .toggle-checked": function () {
      // Call method instead
      Meteor.call("setChecked", this._id, ! this.checked);
    },
    "click .delete": function () {
      // Call method instead
      Meteor.call("deleteTask", this._id);
    },
    // Add an event for the new button to Template.task.events
    "click .toggle-private": function () {
      Meteor.call("setPrivate", this._id, ! this.private);
    }
  });

  // At the bottom of the client code
  Accounts.ui.config({
    passwordSignupFields: "USERNAME_ONLY"
  });
  
  // Check out if the user logs in
  Tracker.autorun(function(){
    if (Meteor.userId()){
      // Change language
      var user = Meteor.user();
      Session.set("language", user.profile.language);
      TAPi18n.setLanguage(user.profile.language);
      Meteor.call("setUserLanguage", user.profile.language);
    }
  });
}

// At the bottom of simple-todos.js, outside of the client-only block
Meteor.methods({
  addTask: function (text) {
    // Make sure the user is logged in before inserting a task
    if (! Meteor.userId()) {
      throw new Meteor.Error("not-authorized");
    }

    Tasks.insert({
      text: text,
      createdAt: new Date(),
      owner: Meteor.userId(),
      username: Meteor.user().username
    });
  },
  deleteTask: function (taskId) {
    // Inside the deleteTask method
    var task = Tasks.findOne(taskId);
    if (task.private && task.owner !== Meteor.userId()) {
      // If the task is private, make sure only the owner can delete it
      throw new Meteor.Error("not-authorized");
    }

    Tasks.remove(taskId);
  },
  setChecked: function (taskId, setChecked) {
    // Inside the setChecked method
    var task = Tasks.findOne(taskId);
    if (task.private && task.owner !== Meteor.userId()) {
      // If the task is private, make sure only the owner can check it off
      throw new Meteor.Error("not-authorized");
    }
    
    Tasks.update(taskId, { $set: { checked: setChecked} });
  },
  // Add a method to Meteor.methods called setPrivate
  setPrivate: function (taskId, setToPrivate) {
    var task = Tasks.findOne(taskId);

    // Make sure only the task owner can make a task private
    if (task.owner !== Meteor.userId()) {
      throw new Meteor.Error("not-authorized");
    }

    Tasks.update(taskId, { $set: { private: setToPrivate } });
  },
  setUserLanguage: function(language) {
    // Change user default language    
    if (Meteor.userId()) {
      Meteor.users.update(Meteor.userId(), { $set: { "profile.language": language } });
    }
  }
});

if (Meteor.isServer) {
  // Only publish tasks that are public or belong to the current user
  Meteor.publish("tasks", function () {
    return Tasks.find({
      $or: [
        { private: {$ne: true} },
        { owner: this.userId }
      ]
    });
  });
}