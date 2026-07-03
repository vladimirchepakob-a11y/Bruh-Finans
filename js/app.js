/* ==========================================
   Finance Pro
   Version 2.0
========================================== */

"use strict";

/* ==========================================
   Telegram
========================================== */

const tg = window.Telegram?.WebApp;

if (tg) {
    tg.ready();
    tg.expand();

    try {
        tg.disableVerticalSwipes();
    } catch (e) {}
}

/* ==========================================
   App
========================================== */

const App = {

    version: "2.0.0",

    currentPage: "dashboard",

    charts: {},

    initialized: false

};

/* ==========================================
   DOM
========================================== */

const $ = selector => document.querySelector(selector);

const $$ = selector => document.querySelectorAll(selector);

/* ==========================================
   Navigation
========================================== */

function openPage(page){

    document.querySelectorAll(".page").forEach(el=>{

        el.classList.remove("active-page");

    });

    document.querySelectorAll(".menu-item").forEach(el=>{

        el.classList.remove("active");

    });

    const section=document.getElementById(page+"Page");

    if(section){

        section.classList.add("active-page");

    }

    const button=document.querySelector(`[data-page="${page}"]`);

    if(button){

        button.classList.add("active");

    }

    App.currentPage=page;

}

/* ==========================================
   Events
========================================== */

function initNavigation(){

    $$(".menu-item").forEach(button=>{

        button.addEventListener("click",()=>{

            openPage(button.dataset.page);

        });

    });

}

/* ==========================================
   Start
========================================== */

document.addEventListener("DOMContentLoaded",async()=>{

    initNavigation();

    if(typeof loadDatabase==="function"){

        await loadDatabase();

    }

    if(typeof renderDashboard==="function"){

        renderDashboard();

    }

    App.initialized=true;

});