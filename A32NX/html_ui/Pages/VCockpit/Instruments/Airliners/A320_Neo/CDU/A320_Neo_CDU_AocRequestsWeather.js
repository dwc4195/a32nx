class CDUAocRequestsWeather {
    static ShowPage(mcdu, store = { "reqType": 0, "depIcao": "", "arrIcao": "", "arpt1": "", "arpt2": "", "arpt3": "", "arpt4": "", "sendStatus": ""}) {
        mcdu.clearDisplay();

        if (mcdu.flightPlanManager.getOrigin() && mcdu.flightPlanManager.getDestination()) {
            store.arpt1 = mcdu.flightPlanManager.getOrigin().ident;
            store.arpt2 = mcdu.flightPlanManager.getDestination().ident;
        }

        const reqTypes = [
            'METAR',
            'TAF LONG',
            'SIGMET',
            'METAR + TAF'
        ];

        const updateView = () => {
            mcdu.setTemplate([
                ["AOC WEATHER REQUEST"],
                [`WX TYPE`, "AIRPORTS"],
                [`↓${reqTypes[0]}`, `${store.arpt1 != "" ? store.arpt1 : "[ ]"}[color]blue`],
                [""],
                ["", `${store["arpt2"] != "" ? store["arpt2"] : "[ ]"}[color]blue`],
                [""],
                ["", `${store["arpt3"] != "" ? store["arpt3"] : "[ ]"}[color]blue`],
                [""],
                ["", `${store["arpt4"] != "" ? store["arpt4"] : "[ ]"}[color]blue`],
                [""],
                [""],
                ["RETURN TO", `${store["sendStatus"]}`],
                ["<AOC MENU", "SEND*[color]blue"]
            ]);
        }
        updateView();

        mcdu.onRightInput[0] = () => {
            let value = mcdu.inOut;
            mcdu.clearUserInput();
            store["arpt1"] = value;
            CDUAocRequestsWeather.ShowPage(mcdu, store);
        }

        mcdu.onRightInput[1] = () => {
            let value = mcdu.inOut;
            mcdu.clearUserInput();
            store["arpt2"] = value;
            CDUAocRequestsWeather.ShowPage(mcdu, store);
        }

        mcdu.onRightInput[2] = () => {
            let value = mcdu.inOut;
            mcdu.clearUserInput();
            store["arpt3"] = value;
            CDUAocRequestsWeather.ShowPage(mcdu, store);
        }

        mcdu.onRightInput[3] = () => {
            let value = mcdu.inOut;
            mcdu.clearUserInput();
            store["arpt4"] = value;
            CDUAocRequestsWeather.ShowPage(mcdu, store);
        }

        mcdu.onRightInput[5] = async () => {
            store["sendStatus"] = "QUEUED"
            updateView();
            const ICAOS = [store["arpt1"], store["arpt2"], store["arpt3"], store["arpt4"]];
            mcdu.clearUserInput();
            const lines = []; // Prev Messages
            let errors = 0;
            const getData = async () => {
                for (const icao of ICAOS) {
                    if (icao !== "") {
                        await fetch(`https://us-central1-flybywire-metar.cloudfunctions.net/metar-py?source=ms&icao=${icao}`)
                                .then((response) => response.text())
                                .then((data) => {
                                    let error = data.slice(0, 9) == "FBW_ERROR";
                                    
                                    if (!error) {
                                        lines.push(`METAR ${icao}`);

                                        function wordWrapToStringList(text, maxLength) {
                                            let result = [], line = [];
                                            let length = 0;
                                            text.split(" ").forEach(function (word) {
                                                if ((length + word.length) >= maxLength) {
                                                    result.push(line.join(" "));
                                                    line = []; length = 0;
                                                }
                                                length += word.length + 1;
                                                line.push(word);
                                            });
                                            if (line.length > 0) {
                                                result.push(line.join(" "));
                                            }
                                            return result;
                                        };
                                        
                                        const newLines = wordWrapToStringList(data, 25);
                                        newLines.forEach(l => lines.push(l));
                                        lines.push('------------------------');
                                    } else {
                                        lines.push(`METAR ${icao}`);
                                        lines.push('ILLEGAL STATION IDENT');
                                        lines.push('------------------------');
                                        errors += 1;
                                    }
                                })
                    }
                }
                store["sendStatus"] = "SENT"
                updateView();
            }
            
            const newMessage = { "id": Date.now(), "type": "METAR", "time": '00:00', "opened": null, "content": errors > 0 ? ["ILLEGAL STATION IDENT"] : lines, }

            getData().then(() => {
                setTimeout(() => {
                    let timeValue = SimVar.GetGlobalVarValue("ZULU TIME", "seconds");
                    if (timeValue) {
                        const seconds = Number.parseInt(timeValue);
                        const displayTime = Utils.SecondsToDisplayTime(seconds, true, true, false);
                        timeValue = displayTime.toString();
                    }
                    newMessage["time"] = timeValue.substring(0, 5);
                    mcdu.addMessage(newMessage);
                    store["sendStatus"] = "";
                    updateView();
                }, 1000);
            });
        }

        mcdu.onLeftInput[5] = () => {
            CDUAocMenu.ShowPage(mcdu);
        }
    }
}