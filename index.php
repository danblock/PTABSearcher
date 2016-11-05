<?php
set_time_limit(0);
ignore_user_abort(1);
//SELECT *, MATCH(trialNumber,patentNumber,petitionerPartyName,patentOwnerName) AGAINST ('Arista') as Relevance FROM trials WHERE MATCH (trialNumber,patentNumber,petitionerPartyName,patentOwnerName) AGAINST('Arista' IN NATURAL LANGUAGE MODE) HAVING Relevance > .5 ORDER BY Relevance DESC


//define constants
$TRIALNUMBER='trialNumber';
$PATENTNUMBER='patentNumber';
$PATENTOWNERNAME='patentOwnerName';
$PETITIONERNAME='petitionerPartyName';

//search the local database
function searchDatabase($type,$searchTerm){
    $db = new mysqli("localhost", "root", "root", "ptab"); //connect

    if($db->connect_errno > 0){
        die('Unable to connect to database [' . $db->connect_error . ']');
    }

    //setup the statement
    $pStmt ="";
    switch ($type) {
        case $GLOBALS['TRIALNUMBER']:
            $pStmt= "SELECT * FROM trials WHERE trialNumber LIKE ? LIMIT 1000";
            break;
        case $GLOBALS['PATENTNUMBER']:
            $pStmt= "SELECT * FROM trials WHERE patentNumber LIKE ? LIMIT 1000";
            break;
        case $GLOBALS['PATENTOWNERNAME']:
            $pStmt= "SELECT * FROM trials WHERE patentOwnerName LIKE ? LIMIT 1000";
            break;
        case $GLOBALS['PETITIONERNAME']:
            $pStmt ="SELECT * FROM trials WHERE petitionerPartyName LIKE ? LIMIT 1000";
            break;
    }

    $stmt = $db->prepare($pStmt); //limited to 1000 just to stop shenanigans

    $stmt->bind_param("s",$searchTerm); //bind the variables

    if(!$stmt->execute()){
        die('There was an error running the getLastTrialNumber query [' . $db->error . ']');
        return true;
    }
    $result=$stmt->get_result();
    $myArray = array();
    while($row = $result->fetch_object()) {
        array_push($myArray, $row);
    }

    $rowCount = $result->num_rows; //get the number of results returned

    //create metadata array
    $metadata =["limit"=>1000,"offset"=>0,"count"=>$rowCount,"links"=>["rel"=>"self","href"=>'https://ptabdata.uspto.gov/ptab-api/trials?'.$type."=".$searchTerm]];

    //create results array, and add SQL results to it
    $results  =["metadata"=>$metadata,"results"=> $myArray];

    return $results;
}

//get the GET parameters
$searchType=htmlspecialchars($_GET["searchType"]);
$searchString=htmlspecialchars($_GET["searchString"]);
$results = array();

//limit searchstring length to >2 for database considerations and less than 100 to prevent shenanigans
if($searchType !=null && $searchString!=null && strlen($searchString) < 100 && strlen($searchString) > 2) {
    $searchString = "%".$searchString."%";
    switch ($searchType) {
        case $TRIALNUMBER:
            $results = searchDatabase($TRIALNUMBER, $searchString);
            break;
        case $PATENTNUMBER:
            $results = searchDatabase($PATENTNUMBER, $searchString);
            break;
        case $PATENTOWNERNAME:
            $results = searchDatabase($PATENTOWNERNAME, $searchString);
            break;
        case $PETITIONERNAME:
            $results = searchDatabase($PETITIONERNAME, $searchString);
            break;
        default:
            print "INVALID SEARCH TYPE<br>";

    }
}else{
    print "INVALID SEARCH PARAMETERS";
}
print '<pre>'.json_encode($results, JSON_PRETTY_PRINT|JSON_UNESCAPED_SLASHES).'</pre>';




//var_dump($obj);
?>

