<?php


//SELECT *, MATCH(trialNumber,patentNumber,petitionerPartyName,patentOwnerName) AGAINST ('Arista') as Relevance FROM trials WHERE MATCH (trialNumber,patentNumber,petitionerPartyName,patentOwnerName) AGAINST('Arista' IN NATURAL LANGUAGE MODE) HAVING Relevance > .5 ORDER BY Relevance DESC
function getTrialsJSON($offset){
	$jsonurl = "https://ptabdata.uspto.gov/ptab-api/trials?limit=100&sort=-filingDate&offset=".$offset;
    $ch = curl_init();
	curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
	curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
	curl_setopt($ch, CURLOPT_URL, $jsonurl);
	$result = curl_exec($ch);
	curl_close($ch);

	$results = json_decode($result);
    $results = $results->{'results'};
    //var_dump($results);
	return $results;
}

function getLastTrialNumberRetrieved(){
    $db = new mysqli("localhost", "root", "root", "ptab");
    if($db->connect_errno > 0){
        die('Unable to connect to database [' . $db->connect_error . ']');
    }
    $SQL="SELECT * FROM lastTrialNumber WHERE ID=1";
    if(!$result = $db->query($SQL)){
        die('There was an error running the getLastTrialNumber query [' . $db->error . ']');
        return true;
    }
    if($result->num_rows==1){
        $row = $result->fetch_assoc();
        return $row['lastTrialNumber'];
    }

}

function storeLastTrialNumberRetrieved($lastTrialNumber){
    $db = new mysqli("localhost", "root", "root", "ptab");
    if($db->connect_errno > 0){
        die('Unable to connect to database [' . $db->connect_error . ']');
    }
    $SQL="UPDATE lastTrialNumber SET lastTrialNumber='".$lastTrialNumber."' WHERE ID='1'";

    if(!$result = $db->query($SQL)){
        die('There was an error running the storeLastTrialNumber query [' . $db->error . ']');
        return true;
    }
}

function addTrialsToSQL($results,$lastTrial){
    $resultCount = count($results);
    if($resultCount>0) {
        $db = new mysqli("localhost", "root", "root", "ptab");
        if($db->connect_errno > 0){
            die('Unable to connect to database [' . $db->connect_error . ']');
        }

        for ($i = 0; $i < $resultCount; $i++) {
            $trialNumber = $results[$i]->{'trialNumber'};
            if ($trialNumber!=$lastTrial){
                $SQL = "INSERT INTO trials VALUES(\"" .
                    $results[$i]->{'inventorName'} . "\",\"" .
                    $trialNumber . "\",\"" .
                    $results[$i]->{'filingDate'} . "\",\"" .
                    $results[$i]->{'patentOwnerName'} . "\",\"" .
                    $results[$i]->{'patentNumber'} . "\",\"" .
                    $results[$i]->{'applicationNumber'} . "\",\"" .
                    $results[$i]->{'petitionerPartyName'} . "\",\"" .
                    $results[$i]->{'prosecutionStatus'} . "\",\"" .
                    $results[$i]->{'accordedFilingDate'} . "\",\"" .
                    $results[$i]->{'institutionDecisionDate'} . "\",\"" .
                    $results[$i]->{'lastModifiedDatetime'} . "\")";


                //error_log($SQL);
                if(!$result = $db->query($SQL)){
                    die('There was an error running the addTrialsToSQL insert [' . $db->error . ']');
                    return true;
                }

                echo "SQL Statement Execute: ". $SQL."<br>";
            }else{
                //we've matched the last trial, time to break out of the for loop
                return true;
            }
        }
    }
}




//echo htmlentities($row);
$lastTrialNumber =getLastTrialNumberRetrieved();
echo "Last Trial Number Added: " . $lastTrialNumber . "<br>";
echo "Retrieving the most-recent 100 PTAB trials<br>";
$results=getTrialsJSON(0);
echo "Got " . count($results) . " result(s)<br>";

$nextLastTrialNumber = $results[0]->{'trialNumber'}; //since this is sorted by date, the top result is the next last number to store
echo "New Most Recent Trial Number: " . $nextLastTrialNumber ."<br>";
if($lastTrialNumber != $nextLastTrialNumber){
    storeLastTrialNumberRetrieved($nextLastTrialNumber);
    echo "Storing The Last Trial Number in MYSQL: " . $nextLastTrialNumber . "<br>";
}
//echo var_dump($obj);


$resultCount=count($results);
$currentOffset = 0;
$j=0;
while($resultCount > 0) {
    echo "Adding Results to SQL database <br>";
    $result = addTrialsToSQL($results, $lastTrialNumber);
    echo "Results added to SQL database <br>";
    if($result){//if addTrialToSQL returns true, we hit the last IPR gotten
        echo "We have hit the Last IPR petition<br>";
        break;
    }

    $currentOffset+=$resultCount;
    echo "Setting Offset to: " . $currentOffset . "<br>";
    error_log("Offset: " .$currentOffset);
    $results=getTrialsJSON($currentOffset);//get the next results at offset based on length of last recieved
    $resultCount= count($results); //update the result count
    echo "Got " . $resultCount . " result(s)<br>";

    $j++;
}
//var_dump($obj);
?>
Done
