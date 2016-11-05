var searchHistory=[];
var documents=[];
var patentOwnerDocs=[];
var petitionerDocs=[];
var boardDocs=[];
var ordersDocs=[];
var exhibitDocs=[];
var pleadingsDocs=[];
var currentSelectedSearchType="";
var currentSearchTerm="";

var currentTrialNumber;
var currentPetitioner;
var currentPatentOwner;
var currentPatentNumber;

//document ready functions
$(function(){


    //handle back
    window.addEventListener("hashchange", function(e) {
        var searchNums = searchHistory.length;
        if (location.hash.length > 0) {    //we have more than one hash, which means we have done some searches

            times = parseInt(location.hash.replace('#',''),10); //parse the hash off the URL;

            if(times !=searchNums){ //if the hash doesn't match the number of searches the back button must have been pressed
                lastSearch = getLastSearch();
                if(lastSearch !=null){
                    startSearch(lastSearch[0], lastSearch[1]);
                }else{
                    window.location.reload(false);
                }
            }
        } else {
            if(searchHistory.length > 0){ //deal with resetting the hashcount when the dropdown box is selected
                location.hash = searchNums;
            }
        }


    })

    //handle popover
    var curr_popover_btn = null;
    // Hide popovers function
    function hide_popovers(e)
    {
        var container = $(".popover.in");
        if (!container.is(e.target) // if the target of the click isn't the container...
            && container.has(e.target).length === 0) // ... nor a descendant of the container
        {
            if( curr_popover_btn != null )
            {
                $(curr_popover_btn).popover('hide');
                curr_popover_btn = null;
            }
            container.hide();
        }
    }
    // Hide popovers when out of focus
    $('html').click(function(e) {
        hide_popovers(e);
    })
    $('.popover-marker').popover({
        trigger: 'manual'
    }).click(function(e) {
        hide_popovers(e);
        var $popover_btns = $('.popover-marker');
        curr_popover_btn = this;
        var $other_popover_btns = jQuery.grep($($popover_btns), function(popover_btn){
            return ( popover_btn !== curr_popover_btn );
        });
        $($other_popover_btns).popover('hide');
        $(this).popover('toggle');
        e.stopPropagation();
    });

    //bind enter to search button
    $(document).on('keypress', 'input', function(args) {
        if (args.keyCode == 13) {
            $('#searchButton').click();
            return false;
        }
    });

    //make the searching dropdown menu actually show the selection
    $(".dropdown-menu li").click(function(){
        $(this).parents(".input-group-btn").find('.btn').html(
            $(this).text()+" <span class=\"caret\"></span>"
        );
        currentSelectedSearchType= $(this).text();
    });


    //bind the search function to the search button
    $('#searchButton').click(function(e) {
        var searchString = $('#searchString').val();
        startSearch(currentSelectedSearchType,searchString);
        e.preventDefault();

    });
});

//this function kicks it off.
function startSearch(searchType, searchString){

    currentSearchTerm=searchString; //set the global vars
    currentSelectedSearchType=searchType; //override the global var again incase startSearch is called another way

    if(searchString !=""){
        switch(searchType){
            case "Party":
                //for the future
                break;
            case "Patent Number": //do a patent number search
                searchString = searchString.split(",").join(""); //take out the commas if entered;
                httpGetAsync('https://ptabdata.uspto.gov/ptab-api/trials?patentNumber='+searchString,parsePTABSearch);
                break;

            case "Trial Number": //do a trial number search, note we can search directly for the documents here. returns 400 if nothing is found.
                httpGetAsync('https://ptabdata.uspto.gov/ptab-api/trials?trialNumber='+searchString,parsePTABSearch,searchString);
                //httpGetAsync('https://ptabdata.uspto.gov/ptab-api/trials/'+searchString+'/documents',parsePTABDocuments);
                break;
            default:
                //httpGetAsync('https://ptabdata.uspto.gov/ptab-api/trials/'+searchString+'/documents',parsePTABDocuments);
                httpGetAsync('https://ptabdata.uspto.gov/ptab-api/trials?trialNumber='+searchString,parsePTABSearch,searchString);

                break;
        }
    }


}

function getLastSearch(){
    searchHistory.pop();
    if(searchHistory.length>0){
        return searchHistory.pop();
    }else{
        return null;
    }

}

function addSearchtoHistory(type,searchTerm){
    if (searchHistory.length >50){
        searchHistory.shift();
    }
    searchHistory.push([type,searchTerm]);
}

function displaySearchError(){

    $('#searchButton').popover('dispose'); //clear out the popout

    $('#searchButton').popover({
        trigger: 'manual',
        placement: 'right',
        title: 'Error: Case Not Found',
        content: 'No case found with ' + currentSelectedSearchType +': \''+	currentSearchTerm + '\''
    });

    $(".popover.in").show();
    $('#searchButton').popover("show");

    //$('[data-toggle="popover"]').popover('show');

}

//should be switched to jquery
function httpGetAsync(theUrl, callback)
{
    this.callback=callback;
    var self =this;
    $.getJSON(theUrl,
        function(json) {
            self.callback(json);
        })
        .fail(function(){displaySearchError();});
}
function updateTable(docs){

    //$(document).ready(function() {
    populateTable(docs);
    $("#docTable").trigger("update");

    setTimeout(function(){$("#docTable").trigger("sorton",[[[0,1]]])},100);
    //$("#docTable").tablesorter();
    //var sorting =[[0,1]];
    //$("#docTable").trigger("sorton",[sorting]);
    //});

}

function numberWithCommas(n) {
    var parts=n.toString().split(".");
    return parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",") + (parts[1] ? "." + parts[1] : "");
}

//parse the JSON document response in the seperate filter groups, and build a blank table.
function parsePTABDocuments(xmlResponse){

    //reset all the document categories because we have done a new search;
    documents=[];
    patentOwnerDocs=[];
    petitionerDocs=[];
    boardDocs=[];
    ordersDocs=[];
    exhibitDocs=[];
    pleadingsDocs=[];

    var obj = xmlResponse;//JSON.parse(xmlResponse);
    if(obj.results != null){

        //re-adjust search bar because we are now in results display
        $("#imageContainer").remove();
        $("#searchCenterBlock").remove();


        $("#partyNames").html(currentPetitioner +" v. " + currentPatentOwner + "<br>Case: "+currentTrialNumber+" <br>U.S. Pat. No: " + numberWithCommas(currentPatentNumber));

        //this search was successful, so add to search history for back button control
        addSearchtoHistory(currentSelectedSearchType, currentSearchTerm);
        location.hash = searchHistory.length;
        //add the tabs
        document.getElementById("tabs").innerHTML="<ul class=\"tab\">"+
            "<li><a href=\"#\" class=\"tablinks\" onclick=\"updateTable(documents)\">All</a></li>"+
            "<li><a href=\"#\" class=\"tablinks\" onclick=\"updateTable(petitionerDocs)\">Petitioner</a></li>"+
            "<li><a href=\"#\" class=\"tablinks\" onclick=\"updateTable(patentOwnerDocs)\">Patent Owner</a></li>"+
            "<li><a href=\"#\" class=\"tablinks\" onclick=\"updateTable(boardDocs)\">Board</a></li>"+

            "<li style=\"float: right;\"><a href=\"#\" class=\"tablinks\" onclick=\"populateTable(ordersDocs)\">Orders</a></li>"+
            "<li style=\"float: right;\"><a href=\"#\" class=\"tablinks\" onclick=\"populateTable(exhibitDocs)\">Exhibits</a></li>"+
            "<li style=\"float: right;\"><a href=\"#\" class=\"tablinks\" onclick=\"populateTable(pleadingsDocs)\">Pleadings</a></li>"+
            "</ul>";

        //create table
        document.getElementById("demo").innerHTML="<table id=\"docTable\" class=\"tablesorter {sortlist: [[0,1]]}\">"+
            "<thead><tr>"+
            "<th class=\"shrink\">Filing Date</th>"+
            "<th class=\"shrink\">Doc. Num.</th>"+
            "<th class=\"shrink\">Name</th>"+
            "<th class=\"shrink\">Type</th>"+
            "<th class=\"shrink\">Party</th>"+
            "<th class=\"shrink\">Size</th>"+
            "</tr></thead><tbody id=\"docTableBody\"></tbody></table>";


        //turn on sorting, and set up the initial sorting
        /*$(document).ready(function() {
         $("#docTable").tablesorter({sortList:[[0,1]]});
         }
         );*/

        //split the docs into their respective categories
        for(i=0;i<obj.results.length;i++){
            documents.push(obj.results[i]);
            var docParty = obj.results[i].filingParty.toLowerCase();
            var docType = obj.results[i].type.toLowerCase();
            switch(docParty){
                case "petitioner":
                    petitionerDocs.push(obj.results[i]);
                    break;
                case "patent_owner":
                    patentOwnerDocs.push(obj.results[i]);
                    break;

                case "potential_patent_owner":
                    patentOwnerDocs.push(obj.results[i]);
                    break;

                case "board":
                    boardDocs.push(obj.results[i]);
                    break;
            }
            switch(docType){
                case "order":
                    ordersDocs.push(obj.results[i]);
                    break;
                case "exhibit":
                    exhibitDocs.push(obj.results[i]);
                    break;
                default:
                    pleadingsDocs.push(obj.results[i]);
                    break;


            }
        }
        $(document).ready(function() {
            //fill in the table
            populateTable(documents);
            $("#docTable").tablesorter({sortList: [[0,1]]})

            //$("#docTable").trigger("update");
            //$("#docTable").tablesorter();
            //$("#docTable").trigger("sorton",[[0,1]]);
        });

    }
}

//add table rows for the documents passed in as parameters
function populateTable(docs){
    $("#docTable").find("tr:gt(0)").remove();
    //$('#docTable').empty();
    $("#docTable").trigger("update");

    for(i=0;i<docs.length;i++){
        var docName = docs[i].title;
        var docURL;
        var docSize = docs[i].sizeInBytes
        var docParty = docs[i].filingParty;
        var docType = docs[i].type;
        var filingDate = docs[i].filingDatetime;
        var docNum = docs[i].documentNumber;
        var date = new Date(filingDate);

        if(docs[i].links[1] !=null){
            docURL= docs[i].links[1].href
        }

        row = "<tr>"+
            "<td class=\"shrink\">"+date.toLocaleDateString()+"</td>"+
            "<td class=\"shrink\">"+docNum+"</td>"+
            "<td class=\"shrink\"><a href=\""+docURL+"\">"+docName+"</a></td>"+
            "<td class=\"shrink\">"+docType+"</td>"+
            "<td class=\"shrink\">"+docParty+"</td>"+
            "<td class=\"shrink\">"+docSize+" bytes </td></tr>";
        //alert(row);
        $('#docTableBody').append(row);

    }
    $("#docTable").trigger("update");
    setTimeout(function(){$("#docTable").trigger("sorton",[[[0,1]]])},10);
}

function parsePTABSearch(xmlResponse){

    var obj = xmlResponse;//JSON.parse(xmlResponse);
    if(obj !=null){
        if(obj.results.length ==1){
            var links = obj.results[0].links;

            currentPatentNumber=obj.results[0].patentNumber;
            currentTrialNumber=obj.results[0].trialNumber;
            currentPatentOwner=obj.results[0].patentOwnerName;
            currentPetitioner=obj.results[0].petitionerPartyName;

            var documentsURL =null;
            if(links != null){
                for(i=0;i<links.length;i++){
                    if(links[i].rel == "documents"){
                        documentsURL=links[i].href;
                        break;
                    }
                }
            }
            if(documentsURL !=null){
                httpGetAsync(documentsURL,parsePTABDocuments);
                return; //success
            }
        }

    }
    displaySearchError(); //if we are down here, it means one of the if blocks failed, so it's an error.

}



